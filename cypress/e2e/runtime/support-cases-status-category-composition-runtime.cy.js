describe('Cycle A Support Cases status + category composition runtime', () => {
  const sessionValue = 'cycle-a-session';
  const requests = [];
  const cases = [
    { id: 1241, tenant_name: 'Cycle A Market', title: 'Open printer issue', category: 'hardware', priority: 'urgent', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-10T08:00:00Z', updated_at: '2026-09-10T08:10:00Z' },
    { id: 1242, tenant_name: 'Cycle A Warehouse', title: 'Resolved scanner issue', category: 'hardware', priority: 'medium', status: 'resolved', assigned_to: 'ops@example.com', created_at: '2026-09-10T07:00:00Z', updated_at: '2026-09-10T07:10:00Z' },
    { id: 1243, tenant_name: 'Cycle A Pharmacy', title: 'Open report issue', category: 'reports', priority: 'high', status: 'open', assigned_to: 'admin@example.com', created_at: '2026-09-10T06:00:00Z', updated_at: '2026-09-10T06:10:00Z' }
  ];
  const page = (rows) => ({ data: { cases: rows, total: rows.length, page: 1, pageSize: 10 } });

  beforeEach(() => {
    requests.length = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      requests.push({ ...req.query });
      if (req.query.status === 'open' && req.query.category === 'hardware') return req.reply({ statusCode: 200, body: page([cases[0]]) });
      if (req.query.status === 'open') return req.reply({ statusCode: 200, body: page([cases[0], cases[2]]) });
      req.reply({ statusCode: 200, body: page(cases) });
    }).as('supportCasesBoundary');
  });

  it('preserves status while adding category and converges to the authoritative intersection', () => {
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
    cy.contains('Open printer issue').should('be.visible');
    cy.contains('Open report issue').should('be.visible');
    cy.contains('Resolved scanner issue').should('not.exist');

    cy.get('input[name="category"]').parent().click();
    cy.get('[role="option"]').contains(/^hardware$/).click();
    cy.wait('@supportCasesBoundary');
    cy.contains('Open printer issue').should('be.visible');
    cy.contains('Open report issue').should('not.exist');
    cy.contains('Resolved scanner issue').should('not.exist');
    cy.get('input[name="status"]').should('have.value', 'open');
    cy.get('input[name="category"]').should('have.value', 'hardware');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionValue);
    });
    cy.then(() => {
      expect(requests).to.have.length(3);
      expect(requests[1].status).to.eq('open');
      expect(requests[1].category).to.be.undefined;
      expect(requests[2].status).to.eq('open');
      expect(requests[2].category).to.eq('hardware');
      expect(String(requests[2].page)).to.eq('1');
      expect(String(requests[2].pageSize)).to.eq('10');
      expect(requests[2].priority).to.be.undefined;
      expect(requests[2].tenant).to.be.undefined;
    });
  });
});
