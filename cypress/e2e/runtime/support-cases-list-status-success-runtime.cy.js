describe('Cycle A Support Cases list status success runtime', () => {
  const token = 'cycle-a-list-status-success-token';
  let listReads = 0;
  let statusWrites = 0;

  const initialRows = [
    {
      id: 1901,
      tenant_name: 'Cycle A Supermarket',
      title: 'Receipt printer queue stalled',
      category: 'hardware',
      priority: 'high',
      status: 'open',
      assigned_to: 'ops@example.com',
      created_at: '2026-09-11T06:00:00Z',
      updated_at: '2026-09-11T06:05:00Z'
    },
    {
      id: 1902,
      tenant_name: 'Cycle A Pharmacy',
      title: 'Scanner pairing follow-up',
      category: 'hardware',
      priority: 'medium',
      status: 'in_progress',
      assigned_to: 'support@example.com',
      created_at: '2026-09-11T06:10:00Z',
      updated_at: '2026-09-11T06:15:00Z'
    }
  ];

  beforeEach(() => {
    listReads = 0;
    statusWrites = 0;

    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      listReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      expect(String(req.query.page)).to.eq('1');
      expect(String(req.query.pageSize)).to.eq('10');
      req.reply({
        statusCode: 200,
        body: { data: { cases: initialRows, total: 2, page: 1, pageSize: 10 } }
      });
    }).as('supportCasesList');

    cy.intercept({ method: 'PATCH', pathname: '/support/cases/1901/status' }, (req) => {
      statusWrites += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      expect(req.body).to.deep.eq({ status: 'resolved' });
      req.reply({
        statusCode: 200,
        body: {
          data: {
            id: 1901,
            status: 'resolved',
            updated_at: '2026-09-11T08:30:00Z'
          }
        }
      });
    }).as('supportCaseStatus');
  });

  it('updates the authoritative list row from the status mutation without redundant reads', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@supportCasesList').its('response.statusCode').should('eq', 200);
    cy.contains('Receipt printer queue stalled').should('be.visible');
    cy.contains('Scanner pairing follow-up').should('be.visible');

    cy.contains('tr', 'Receipt printer queue stalled').within(() => {
      cy.contains('button', 'Status').click();
    });

    cy.contains('Change Status').should('be.visible');
    cy.get('[role="dialog"]').within(() => {
      cy.get('input').should('have.value', 'open');
      cy.get('[role="combobox"]').click();
    });
    cy.get('li[role="option"][data-value="resolved"]').click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input').should('have.value', 'resolved');
      cy.contains('button', 'Save').click();
    });

    cy.wait('@supportCaseStatus').its('response.statusCode').should('eq', 200);
    cy.contains('Status updated').should('be.visible');
    cy.contains('Change Status').should('not.exist');

    cy.contains('tr', 'Receipt printer queue stalled').within(() => {
      cy.contains(/^resolved$/).should('be.visible');
      cy.contains(/^open$/).should('not.exist');
      cy.contains(/^high$/).should('be.visible');
      cy.contains('ops@example.com').should('be.visible');
    });

    cy.contains('tr', 'Scanner pairing follow-up').within(() => {
      cy.contains(/^in_progress$/).should('be.visible');
      cy.contains(/^medium$/).should('be.visible');
      cy.contains('support@example.com').should('be.visible');
    });

    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(listReads).to.eq(1);
      expect(statusWrites).to.eq(1);
    });
  });
});
