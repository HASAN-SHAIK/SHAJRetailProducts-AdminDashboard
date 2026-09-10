describe('Cycle A Support Cases category + tenant composition runtime', () => {
  const sessionMarker = 'cycle-a-category-tenant-session';
  const requests = [];
  const cases = [
    { id: 1281, tenant_name: 'Cycle A Supermarket', title: 'Supermarket printer hardware issue', category: 'hardware', priority: 'urgent', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-11T00:10:00Z', updated_at: '2026-09-11T00:20:00Z' },
    { id: 1282, tenant_name: 'Cycle A Pharmacy', title: 'Pharmacy scanner hardware issue', category: 'hardware', priority: 'medium', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-11T00:00:00Z', updated_at: '2026-09-11T00:10:00Z' },
    { id: 1283, tenant_name: 'Cycle A Supermarket', title: 'Supermarket reports issue', category: 'reports', priority: 'medium', status: 'open', assigned_to: 'admin@example.com', created_at: '2026-09-10T23:50:00Z', updated_at: '2026-09-11T00:00:00Z' }
  ];
  const page = (rows) => ({ data: { cases: rows, total: rows.length, page: 1, pageSize: 10 } });

  beforeEach(() => {
    requests.length = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      expect(req.headers.authorization).to.be.a('string').and.not.be.empty;
      requests.push({ ...req.query });
      if (req.query.category === 'hardware' && req.query.tenant === 'Cycle A Supermarket') {
        return req.reply({ statusCode: 200, body: page([cases[0]]) });
      }
      if (req.query.category === 'hardware') {
        return req.reply({ statusCode: 200, body: page([cases[0], cases[1]]) });
      }
      req.reply({ statusCode: 200, body: page(cases) });
    }).as('supportCasesBoundary');
  });

  it('preserves category while adding tenant and converges to the authoritative intersection', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionMarker);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Supermarket printer hardware issue').should('be.visible');
    cy.contains('Pharmacy scanner hardware issue').should('be.visible');
    cy.contains('Supermarket reports issue').should('be.visible');

    cy.get('input[name="category"]').parent().click();
    cy.get('[role="option"]').contains(/^hardware$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Supermarket printer hardware issue').should('be.visible');
    cy.contains('Pharmacy scanner hardware issue').should('be.visible');
    cy.contains('Supermarket reports issue').should('not.exist');

    cy.get('input[name="tenant"]').then(($input) => {
      const input = $input[0];
      const valueSetter = Object.getOwnPropertyDescriptor(input.ownerDocument.defaultView.HTMLInputElement.prototype, 'value').set;
      valueSetter.call(input, 'Cycle A Supermarket');
      input.dispatchEvent(new input.ownerDocument.defaultView.Event('input', { bubbles: true }));
    });
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Supermarket printer hardware issue').should('be.visible');
    cy.contains('Pharmacy scanner hardware issue').should('not.exist');
    cy.contains('Supermarket reports issue').should('not.exist');
    cy.get('input[name="category"]').should('have.value', 'hardware');
    cy.get('input[name="tenant"]').should('have.value', 'Cycle A Supermarket');
    cy.get('input[name="status"]').should('have.value', 'all');
    cy.get('input[name="priority"]').should('have.value', 'all');
    cy.get('button[aria-current="true"]').should('contain.text', '1');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionMarker);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(3);
      expect(requests[0].category).to.be.undefined;
      expect(requests[0].tenant).to.be.undefined;
      expect(requests[1].category).to.eq('hardware');
      expect(requests[1].tenant).to.be.undefined;
      expect(requests[2].category).to.eq('hardware');
      expect(requests[2].tenant).to.eq('Cycle A Supermarket');
      expect(String(requests[2].page)).to.eq('1');
      expect(String(requests[2].pageSize)).to.eq('10');
      expect(requests[2].status).to.be.undefined;
      expect(requests[2].priority).to.be.undefined;
    });
  });
});
