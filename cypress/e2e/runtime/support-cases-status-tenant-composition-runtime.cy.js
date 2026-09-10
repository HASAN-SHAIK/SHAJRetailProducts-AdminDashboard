describe('Cycle A Support Cases status + tenant composition runtime', () => {
  const token = 'cycle-a-support-status-tenant-token';
  const requests = [];
  const cases = [
    { id: 1261, tenant_name: 'Cycle A Supermarket', title: 'Open supermarket printer issue', category: 'hardware', priority: 'urgent', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-10T10:00:00Z', updated_at: '2026-09-10T10:10:00Z' },
    { id: 1262, tenant_name: 'Cycle A Pharmacy', title: 'Open pharmacy scanner issue', category: 'hardware', priority: 'medium', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-10T09:00:00Z', updated_at: '2026-09-10T09:10:00Z' },
    { id: 1263, tenant_name: 'Cycle A Supermarket', title: 'Resolved supermarket report issue', category: 'reports', priority: 'low', status: 'resolved', assigned_to: 'admin@example.com', created_at: '2026-09-10T08:00:00Z', updated_at: '2026-09-10T08:10:00Z' }
  ];
  const page = (rows) => ({ data: { cases: rows, total: rows.length, page: 1, pageSize: 10 } });

  beforeEach(() => {
    requests.length = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      requests.push({ ...req.query });
      if (req.query.status === 'open' && req.query.tenant === 'Cycle A Supermarket') {
        return req.reply({ statusCode: 200, body: page([cases[0]]) });
      }
      if (req.query.status === 'open') {
        return req.reply({ statusCode: 200, body: page([cases[0], cases[1]]) });
      }
      req.reply({ statusCode: 200, body: page(cases) });
    }).as('supportCasesBoundary');
  });

  it('preserves status while adding tenant and converges to the authoritative intersection', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Open supermarket printer issue').should('be.visible');
    cy.contains('Open pharmacy scanner issue').should('be.visible');
    cy.contains('Resolved supermarket report issue').should('be.visible');

    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains(/^open$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Open supermarket printer issue').should('be.visible');
    cy.contains('Open pharmacy scanner issue').should('be.visible');
    cy.contains('Resolved supermarket report issue').should('not.exist');

    cy.get('input[name="tenant"]').then(($input) => {
      const input = $input[0];
      const valueSetter = Object.getOwnPropertyDescriptor(
        input.ownerDocument.defaultView.HTMLInputElement.prototype,
        'value'
      ).set;
      valueSetter.call(input, 'Cycle A Supermarket');
      input.dispatchEvent(new input.ownerDocument.defaultView.Event('input', { bubbles: true }));
    });
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Open supermarket printer issue').should('be.visible');
    cy.contains('Open pharmacy scanner issue').should('not.exist');
    cy.contains('Resolved supermarket report issue').should('not.exist');
    cy.get('input[name="status"]').should('have.value', 'open');
    cy.get('input[name="tenant"]').should('have.value', 'Cycle A Supermarket');
    cy.get('input[name="priority"]').should('have.value', 'all');
    cy.get('input[name="category"]').should('have.value', 'all');
    cy.get('button[aria-current="true"]').should('contain.text', '1');
    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(3);
      expect(requests[0].status).to.be.undefined;
      expect(requests[0].tenant).to.be.undefined;
      expect(requests[1].status).to.eq('open');
      expect(requests[1].tenant).to.be.undefined;
      expect(requests[2].status).to.eq('open');
      expect(requests[2].tenant).to.eq('Cycle A Supermarket');
      expect(String(requests[2].page)).to.eq('1');
      expect(String(requests[2].pageSize)).to.eq('10');
      expect(requests[2].priority).to.be.undefined;
      expect(requests[2].category).to.be.undefined;
    });
  });
});
