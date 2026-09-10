describe('Cycle A Support Cases category + priority composition runtime', () => {
  const sessionValue = 'cycle-a-session';
  const requests = [];
  const cases = [
    { id: 1231, tenant_name: 'Cycle A Market', title: 'Printer unavailable', category: 'hardware', priority: 'urgent', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-10T08:00:00Z', updated_at: '2026-09-10T08:10:00Z' },
    { id: 1232, tenant_name: 'Cycle A Warehouse', title: 'Scanner intermittent', category: 'hardware', priority: 'medium', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-10T07:00:00Z', updated_at: '2026-09-10T07:10:00Z' },
    { id: 1233, tenant_name: 'Cycle A Pharmacy', title: 'Report discrepancy', category: 'reports', priority: 'urgent', status: 'open', assigned_to: 'admin@example.com', created_at: '2026-09-10T06:00:00Z', updated_at: '2026-09-10T06:10:00Z' }
  ];
  const page = (rows) => ({ data: { cases: rows, total: rows.length, page: 1, pageSize: 10 } });

  beforeEach(() => {
    requests.length = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      requests.push({ ...req.query });
      if (req.query.category === 'hardware' && req.query.priority === 'urgent') return req.reply({ statusCode: 200, body: page([cases[0]]) });
      if (req.query.category === 'hardware') return req.reply({ statusCode: 200, body: page([cases[0], cases[1]]) });
      req.reply({ statusCode: 200, body: page(cases) });
    }).as('supportCasesBoundary');
  });

  it('preserves category while adding priority and converges to the authoritative intersection', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionValue);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', role: 'platform_admin' }));
      }
    });
    cy.wait('@supportCasesBoundary');
    cy.get('input[name="category"]').parent().click();
    cy.get('[role="option"]').contains(/^hardware$/).click();
    cy.wait('@supportCasesBoundary');
    cy.contains('Printer unavailable').should('be.visible');
    cy.contains('Scanner intermittent').should('be.visible');
    cy.contains('Report discrepancy').should('not.exist');

    cy.get('input[name="priority"]').parent().click();
    cy.get('[role="option"]').contains(/^urgent$/).click();
    cy.wait('@supportCasesBoundary');
    cy.contains('Printer unavailable').should('be.visible');
    cy.contains('Scanner intermittent').should('not.exist');
    cy.contains('Report discrepancy').should('not.exist');
    cy.get('input[name="category"]').should('have.value', 'hardware');
    cy.get('input[name="priority"]').should('have.value', 'urgent');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.then(() => {
      expect(requests).to.have.length(3);
      expect(requests[1].category).to.eq('hardware');
      expect(requests[1].priority).to.be.undefined;
      expect(requests[2].category).to.eq('hardware');
      expect(requests[2].priority).to.eq('urgent');
      expect(String(requests[2].page)).to.eq('1');
      expect(requests[2].status).to.be.undefined;
      expect(requests[2].tenant).to.be.undefined;
    });
  });
});