describe('Cycle A Support Cases clear Category preserving other filters runtime', () => {
  const sessionMarker = 'cycle-a-clear-category-session';
  const requests = [];
  const cases = [
    { id: 1601, tenant_name: 'Cycle A Supermarket', title: 'Open urgent supermarket printer hardware issue', category: 'hardware', priority: 'urgent', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-11T03:30:00Z', updated_at: '2026-09-11T03:40:00Z' },
    { id: 1602, tenant_name: 'Cycle A Supermarket', title: 'Open urgent supermarket reports issue', category: 'reports', priority: 'urgent', status: 'open', assigned_to: 'admin@example.com', created_at: '2026-09-11T03:20:00Z', updated_at: '2026-09-11T03:30:00Z' },
    { id: 1603, tenant_name: 'Cycle A Supermarket', title: 'Open medium supermarket hardware issue', category: 'hardware', priority: 'medium', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-11T03:10:00Z', updated_at: '2026-09-11T03:20:00Z' },
    { id: 1604, tenant_name: 'Cycle A Pharmacy', title: 'Open urgent pharmacy hardware issue', category: 'hardware', priority: 'urgent', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-11T03:00:00Z', updated_at: '2026-09-11T03:10:00Z' },
    { id: 1605, tenant_name: 'Cycle A Supermarket', title: 'Resolved urgent supermarket reports issue', category: 'reports', priority: 'urgent', status: 'resolved', assigned_to: 'admin@example.com', created_at: '2026-09-11T02:50:00Z', updated_at: '2026-09-11T03:00:00Z' }
  ];
  const page = (rows) => ({ data: { cases: rows, total: rows.length, page: 1, pageSize: 10 } });

  beforeEach(() => {
    requests.length = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      expect(req.headers.authorization).to.be.a('string').and.not.be.empty;
      requests.push({ ...req.query });
      if (req.query.status === 'open' && req.query.category === 'hardware' && req.query.priority === 'urgent' && req.query.tenant === 'Cycle A Supermarket') {
        return req.reply({ statusCode: 200, body: page([cases[0]]) });
      }
      if (req.query.status === 'open' && req.query.priority === 'urgent' && req.query.tenant === 'Cycle A Supermarket' && req.query.category === undefined) {
        return req.reply({ statusCode: 200, body: page([cases[0], cases[1]]) });
      }
      if (req.query.status === 'open' && req.query.category === 'hardware' && req.query.priority === 'urgent') {
        return req.reply({ statusCode: 200, body: page([cases[0], cases[3]]) });
      }
      if (req.query.status === 'open' && req.query.category === 'hardware') {
        return req.reply({ statusCode: 200, body: page([cases[0], cases[2], cases[3]]) });
      }
      if (req.query.status === 'open') {
        return req.reply({ statusCode: 200, body: page([cases[0], cases[1], cases[2], cases[3]]) });
      }
      req.reply({ statusCode: 200, body: page(cases) });
    }).as('supportCasesBoundary');
  });

  it('clears only Category while preserving Status, Priority and Tenant and restores authoritative three-filter results', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', sessionMarker);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains(/^open$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[name="category"]').parent().click();
    cy.get('[role="option"]').contains(/^hardware$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[name="priority"]').parent().click();
    cy.get('[role="option"]').contains(/^urgent$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[name="tenant"]').then(($input) => {
      const input = $input[0];
      const valueSetter = Object.getOwnPropertyDescriptor(input.ownerDocument.defaultView.HTMLInputElement.prototype, 'value').set;
      valueSetter.call(input, 'Cycle A Supermarket');
      input.dispatchEvent(new input.ownerDocument.defaultView.Event('input', { bubbles: true }));
    });
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains(cases[0].title).should('be.visible');
    cy.contains(cases[1].title).should('not.exist');

    cy.get('input[name="category"]').parent().click();
    cy.get('[role="option"]').contains(/^All$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.contains(cases[0].title).should('be.visible');
    cy.contains(cases[1].title).should('be.visible');
    cy.contains(cases[2].title).should('not.exist');
    cy.contains(cases[3].title).should('not.exist');
    cy.contains(cases[4].title).should('not.exist');
    cy.get('input[name="status"]').should('have.value', 'open');
    cy.get('input[name="category"]').should('have.value', 'all');
    cy.get('input[name="priority"]').should('have.value', 'urgent');
    cy.get('input[name="tenant"]').should('have.value', 'Cycle A Supermarket');
    cy.get('button[aria-current="true"]').should('contain.text', '1');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(sessionMarker);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(6);
      expect(requests[4].status).to.eq('open');
      expect(requests[4].category).to.eq('hardware');
      expect(requests[4].priority).to.eq('urgent');
      expect(requests[4].tenant).to.eq('Cycle A Supermarket');
      expect(requests[5].status).to.eq('open');
      expect(requests[5].category).to.be.undefined;
      expect(requests[5].priority).to.eq('urgent');
      expect(requests[5].tenant).to.eq('Cycle A Supermarket');
      expect(String(requests[5].page)).to.eq('1');
      expect(String(requests[5].pageSize)).to.eq('10');
    });
  });
});
