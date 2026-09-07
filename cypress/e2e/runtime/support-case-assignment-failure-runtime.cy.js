describe('Cycle A Support Case assignment failure runtime', () => {
  const sessionValue = 'cycle-a-support-assignment-failure-session';
  let detailReads = 0;
  let assignmentWrites = 0;

  beforeEach(() => {
    detailReads = 0;
    assignmentWrites = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases/42' }, (req) => {
      detailReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${sessionValue}`);
      req.reply({ statusCode: 200, body: { id: 42, title: 'Receipt printer intermittently offline', tenant_name: 'Cycle A Market', category: 'printer', assigned_to: 'admin-7', assigned_to_name: 'Asha Admin', status: 'open', priority: 'high', description: 'Printer disconnects during peak billing.', created_at: '2026-09-06T10:00:00.000Z', updated_at: '2026-09-06T10:05:00.000Z', messages: [{ id: 1, author: 'Store Manager', role: 'tenant', body: 'Issue reproduced twice.', created_at: '2026-09-06T10:02:00.000Z' }] } });
    }).as('supportCaseDetailBoundary');
    cy.intercept({ method: 'PATCH', pathname: '/support/cases/42/assign' }, (req) => {
      assignmentWrites += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${sessionValue}`);
      expect(req.body).to.deep.eq({ assigned_to: 'cycle-a-support-lead@example.com' });
      req.reply({ statusCode: 500, body: { message: 'Support assignment unavailable' } });
    }).as('supportCaseAssignmentBoundary');
  });

  it('surfaces the authoritative assignment error and preserves retryable authoritative state', () => {
    cy.visit('/admin/support-cases/42', { onBeforeLoad(win) {
      win.localStorage.setItem('shaj_admin_token', sessionValue);
      win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
    }});
    cy.wait('@supportCaseDetailBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Receipt printer intermittently offline').should('be.visible');
    cy.contains('Asha Admin').should('be.visible');
    cy.contains('open').should('be.visible');
    cy.contains('high').should('be.visible');
    cy.contains('Issue reproduced twice.').should('be.visible');

    cy.contains('button', 'Assign Admin').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Assign Admin').should('be.visible');
      cy.get('input').clear().type('cycle-a-support-lead@example.com');
      cy.contains('button', 'Assign').click();
    });

    cy.wait('@supportCaseAssignmentBoundary').its('response.statusCode').should('eq', 500);
    cy.contains('Support assignment unavailable').should('be.visible');
    cy.contains('Case assigned').should('not.exist');
    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.contains('Assign Admin').should('be.visible');
      cy.get('input').should('have.value', 'cycle-a-support-lead@example.com');
      cy.contains('button', 'Assign').should('be.enabled');
    });
    cy.contains('Asha Admin').should('be.visible');
    cy.contains('Cycle A Support Lead').should('not.exist');
    cy.contains('Receipt printer intermittently offline').should('be.visible');
    cy.contains('open').should('be.visible');
    cy.contains('high').should('be.visible');
    cy.contains('Issue reproduced twice.').should('be.visible');
    cy.location('pathname').should('eq', '/admin/support-cases/42');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });
    cy.then(() => {
      expect(detailReads).to.eq(1);
      expect(assignmentWrites).to.eq(1);
    });
  });
});
