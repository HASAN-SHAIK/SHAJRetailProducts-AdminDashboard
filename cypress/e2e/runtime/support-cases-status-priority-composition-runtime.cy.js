describe('Cycle A Support Cases status + priority composition runtime', () => {
  const sessionValue = 'cycle-a-session';
  const requests = [];
  const cases = [
    { id: 1251, tenant_name: 'Cycle A Market', title: 'Open urgent printer issue', category: 'hardware', priority: 'urgent', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-10T09:00:00Z', updated_at: '2026-09-10T09:10:00Z' },
    { id: 1252, tenant_name: 'Cycle A Warehouse', title: 'Open medium scanner issue', category: 'hardware', priority: 'medium', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-10T08:00:00Z', updated_at: '2026-09-10T08:10:00Z' },
    { id: 1253, tenant_name: 'Cycle A Pharmacy', title: 'Resolved urgent report issue', category: 'reports', priority: 'urgent', status: 'resolved', assigned_to: 'admin@example.com', created_at: '2026-09-10T07:00:00Z', updated_at: '2026-09-10T07:10:00Z' }
  ];
  const page = (rows) => ({ data: { cases: rows, total: rows.length, page: 1, pageSize: 10 } });

  beforeEach(() => {
    requests.length = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      requests.push({ ...req.query });
      if (req.query.status === 'open' && req.query.priority === 'urgent') return req.reply({ statusCode: 200, body: page([cases[0]]) });
      if (req.query.status === 'open') return req.reply({ statusCode: 200, body: page([cases[0], cases[1]]) });
      req.reply({ statusCode: 200, body: page(cases) });
    }).as('supportCasesBoundary');
  });

  it('preserves status while adding priority and converges to the authoritative intersection', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionValue);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', role: 'platform_admin' }));
      }
    });
    cy.wait('@supportCasesBoundary');

    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains(/^open$/).click();
    cy.wait('@supportCasesBoundary');
    cy.contains('Open urgent printer issue').should('be.visible');
    cy.contains('Open medium scanner issue').should('be.visible');
    cy.contains('Resolved urgent report issue').should('not.exist');

    cy.get('input[name="priority"]').parent().click();
    cy.get('[role="option"]').contains(/^urgent$/).click();
    cy.wait('@supportCasesBoundary');
    cy.contains('Open urgent printer issue').should('be.visible');
    cy.contains('Open medium scanner issue').should('not.exist');
    cy.contains('Resolved urgent report issue').should('not.exist');
    cy.get('input[name="status"]').should('have.value', 'open');
    cy.get('input[name="priority"]').should('have.value', 'urgent');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
    });
    cy.then(() => {
      expect(requests).to.have.length(3);
      expect(requests[1].status).to.eq('open');
      expect(requests[1].priority).to.be.undefined;
      expect(requests[2].status).to.eq('open');
      expect(requests[2].priority).to.eq('urgent');
      expect(String(requests[2].page)).to.eq('1');
      expect(String(requests[2].pageSize)).to.eq('10');
      expect(requests[2].category).to.be.undefined;
      expect(requests[2].tenant).to.be.undefined;
    });
  });
});