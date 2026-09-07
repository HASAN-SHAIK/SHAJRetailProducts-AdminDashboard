describe('Cycle A Support Case priority update failure runtime', () => {
  const sessionValue = 'cycle-a-support-priority-failure-session';
  let detailReads = 0;
  let priorityWrites = 0;

  beforeEach(() => {
    detailReads = 0;
    priorityWrites = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases/42' }, (req) => {
      detailReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${sessionValue}`);
      req.reply({ statusCode: 200, body: { id: 42, title: 'Receipt printer intermittently offline', tenant_name: 'Cycle A Market', category: 'printer', assigned_to: 'admin-7', assigned_to_name: 'Asha Admin', status: 'open', priority: 'high', description: 'Printer disconnects during peak billing.', created_at: '2026-09-06T10:00:00.000Z', updated_at: '2026-09-06T10:05:00.000Z', messages: [{ id: 1, author: 'Store Manager', role: 'tenant', body: 'Issue reproduced twice.', created_at: '2026-09-06T10:02:00.000Z' }] } });
    }).as('supportCaseDetailBoundary');
    cy.intercept({ method: 'PATCH', pathname: '/support/cases/42/priority' }, (req) => {
      priorityWrites += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${sessionValue}`);
      expect(req.body).to.deep.eq({ priority: 'urgent' });
      req.reply({ statusCode: 500, body: { message: 'Support priority update unavailable' } });
    }).as('supportCasePriorityBoundary');
  });

  it('surfaces the authoritative priority error and preserves retryable authoritative state', () => {
    cy.visit('/admin/support-cases/42', { onBeforeLoad(win) {
      win.localStorage.setItem('shaj_admin_token', sessionValue);
      win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
    }});
    cy.wait('@supportCaseDetailBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Receipt printer intermittently offline').should('be.visible');
    cy.contains('open').should('be.visible');
    cy.contains('high').should('be.visible');
    cy.contains('Issue reproduced twice.').should('be.visible');

    cy.contains('button', 'Change Priority').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Change Priority').should('be.visible');
      cy.get('[role="combobox"]').click();
    });
    cy.get('[role="option"]').contains('urgent').click();
    cy.get('[role="dialog"]').contains('button', 'Save').click();

    cy.wait('@supportCasePriorityBoundary').its('response.statusCode').should('eq', 500);
    cy.contains('Support priority update unavailable').should('be.visible');
    cy.contains('Priority updated').should('not.exist');
    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.contains('Change Priority').should('be.visible');
      cy.get('[role="combobox"]').should('contain.text', 'urgent');
      cy.contains('button', 'Save').should('be.enabled');
    });
    cy.contains('high').should('be.visible');
    cy.contains('Receipt printer intermittently offline').should('be.visible');
    cy.contains('open').should('be.visible');
    cy.contains('Issue reproduced twice.').should('be.visible');
    cy.location('pathname').should('eq', '/admin/support-cases/42');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });
    cy.then(() => {
      expect(detailReads).to.eq(1);
      expect(priorityWrites).to.eq(1);
    });
  });
});