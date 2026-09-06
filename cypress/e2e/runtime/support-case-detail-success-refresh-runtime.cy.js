describe('Cycle A Support Case Detail success/refresh runtime', () => {
  const token = 'cycle-a-support-detail-success-token';
  let detailReads = 0;

  beforeEach(() => {
    detailReads = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases/42' }, (req) => {
      detailReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      const initial = {
        id: 42,
        title: 'Receipt printer intermittently offline',
        tenant_name: 'Cycle A Market',
        category: 'printer',
        assigned_to: 'admin-7',
        assigned_to_name: 'Asha Admin',
        status: 'open',
        priority: 'high',
        description: 'Printer disconnects during peak billing.',
        created_at: '2026-09-06T10:00:00.000Z',
        updated_at: '2026-09-06T10:05:00.000Z',
        messages: [
          { id: 1, author: 'Store Manager', role: 'tenant', body: 'Issue reproduced twice.', created_at: '2026-09-06T10:02:00.000Z' }
        ]
      };
      const refreshed = {
        ...initial,
        status: 'in_progress',
        priority: 'urgent',
        assigned_to_name: 'Cycle A Support Lead',
        description: 'Support reproduced the printer disconnect and started investigation.',
        updated_at: '2026-09-06T10:20:00.000Z',
        messages: [
          ...initial.messages,
          { id: 2, author: 'Cycle A Support Lead', role: 'admin', body: 'Investigating spooler connectivity now.', created_at: '2026-09-06T10:19:00.000Z' }
        ]
      };
      req.reply({ statusCode: 200, body: detailReads === 1 ? initial : refreshed });
    }).as('supportCaseDetailBoundary');
  });

  it('renders authoritative detail and replaces it with refreshed server state while preserving session and route', () => {
    cy.visit('/admin/support-cases/42', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@supportCaseDetailBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Receipt printer intermittently offline').should('be.visible');
    cy.contains('Cycle A Market').should('be.visible');
    cy.contains('printer').should('be.visible');
    cy.contains('Asha Admin').should('be.visible');
    cy.contains('open').should('be.visible');
    cy.contains('high').should('be.visible');
    cy.contains('Printer disconnects during peak billing.').should('be.visible');
    cy.contains('Issue reproduced twice.').should('be.visible');
    cy.contains('Investigating spooler connectivity now.').should('not.exist');

    cy.get('[aria-label="Refresh support case"]').click();
    cy.wait('@supportCaseDetailBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('in_progress').should('be.visible');
    cy.contains('urgent').should('be.visible');
    cy.contains('Cycle A Support Lead').should('be.visible');
    cy.contains('Support reproduced the printer disconnect and started investigation.').should('be.visible');
    cy.contains('Investigating spooler connectivity now.').should('be.visible');
    cy.contains('Asha Admin').should('not.exist');
    cy.contains('Printer disconnects during peak billing.').should('not.exist');

    cy.location('pathname').should('eq', '/admin/support-cases/42');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });
    cy.then(() => expect(detailReads).to.eq(2));
  });
});
