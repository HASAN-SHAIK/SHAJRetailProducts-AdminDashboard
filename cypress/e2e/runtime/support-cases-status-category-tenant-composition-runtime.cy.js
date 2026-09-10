describe('Cycle A Support Cases status + category + tenant composition runtime', () => {
  const sessionMarker = 'cycle-a-status-category-tenant-session';
  const requests = [];
  const cases = [
    { id: 1291, tenant_name: 'Cycle A Supermarket', title: 'Open supermarket printer hardware issue', category: 'hardware', priority: 'urgent', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-11T01:10:00Z', updated_at: '2026-09-11T01:20:00Z' },
    { id: 1292, tenant_name: 'Cycle A Pharmacy', title: 'Open pharmacy scanner hardware issue', category: 'hardware', priority: 'medium', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-11T01:00:00Z', updated_at: '2026-09-11T01:10:00Z' },
    { id: 1293, tenant_name: 'Cycle A Supermarket', title: 'Resolved supermarket printer hardware issue', category: 'hardware', priority: 'medium', status: 'resolved', assigned_to: 'admin@example.com', created_at: '2026-09-11T00:50:00Z', updated_at: '2026-09-11T01:00:00Z' },
    { id: 1294, tenant_name: 'Cycle A Supermarket', title: 'Open supermarket reports issue', category: 'reports', priority: 'low', status: 'open', assigned_to: 'admin@example.com', created_at: '2026-09-11T00:40:00Z', updated_at: '2026-09-11T00:50:00Z' }
  ];
  const page = (rows) => ({ data: { cases: rows, total: rows.length, page: 1, pageSize: 10 } });

  beforeEach(() => {
    requests.length = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      expect(req.headers.authorization).to.be.a('string').and.not.be.empty;
      requests.push({ ...req.query });
      if (req.query.status === 'open' && req.query.category === 'hardware' && req.query.tenant === 'Cycle A Supermarket') {
        return req.reply({ statusCode: 200, body: page([cases[0]]) });
      }
      if (req.query.status === 'open' && req.query.category === 'hardware') {
        return req.reply({ statusCode: 200, body: page([cases[0], cases[1]]) });
      }
      if (req.query.status === 'open') {
        return req.reply({ statusCode: 200, body: page([cases[0], cases[1], cases[3]]) });
      }
      req.reply({ statusCode: 200, body: page(cases) });
    }).as('supportCasesBoundary');
  });

  it('preserves status and category while adding tenant and converges to the authoritative three-filter intersection', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionMarker);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Open supermarket printer hardware issue').should('be.visible');
    cy.contains('Open pharmacy scanner hardware issue').should('be.visible');
    cy.contains('Resolved supermarket printer hardware issue').should('be.visible');
    cy.contains('Open supermarket reports issue').should('be.visible');

    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains(/^open$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Resolved supermarket printer hardware issue').should('not.exist');

    cy.get('input[name="category"]').parent().click();
    cy.get('[role="option"]').contains(/^hardware$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Open supermarket printer hardware issue').should('be.visible');
    cy.contains('Open pharmacy scanner hardware issue').should('be.visible');
    cy.contains('Open supermarket reports issue').should('not.exist');

    cy.get('input[name="tenant"]').then(($input) => {
      const input = $input[0];
      const valueSetter = Object.getOwnPropertyDescriptor(input.ownerDocument.defaultView.HTMLInputElement.prototype, 'value').set;
      valueSetter.call(input, 'Cycle A Supermarket');
      input.dispatchEvent(new input.ownerDocument.defaultView.Event('input', { bubbles: true }));
    });
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Open supermarket printer hardware issue').should('be.visible');
    cy.contains('Open pharmacy scanner hardware issue').should('not.exist');
    cy.contains('Resolved supermarket printer hardware issue').should('not.exist');
    cy.contains('Open supermarket reports issue').should('not.exist');
    cy.get('input[name="status"]').should('have.value', 'open');
    cy.get('input[name="category"]').should('have.value', 'hardware');
    cy.get('input[name="tenant"]').should('have.value', 'Cycle A Supermarket');
    cy.get('input[name="priority"]').should('have.value', 'all');
    cy.get('button[aria-current="true"]').should('contain.text', '1');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionMarker);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(4);
      expect(requests[0].status).to.be.undefined;
      expect(requests[0].category).to.be.undefined;
      expect(requests[0].tenant).to.be.undefined;
      expect(requests[1].status).to.eq('open');
      expect(requests[1].category).to.be.undefined;
      expect(requests[1].tenant).to.be.undefined;
      expect(requests[2].status).to.eq('open');
      expect(requests[2].category).to.eq('hardware');
      expect(requests[2].tenant).to.be.undefined;
      expect(requests[3].status).to.eq('open');
      expect(requests[3].category).to.eq('hardware');
      expect(requests[3].tenant).to.eq('Cycle A Supermarket');
      expect(String(requests[3].page)).to.eq('1');
      expect(String(requests[3].pageSize)).to.eq('10');
      expect(requests[3].priority).to.be.undefined;
    });
  });
});