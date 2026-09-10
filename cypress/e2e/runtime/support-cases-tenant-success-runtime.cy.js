describe('Cycle A Support Cases tenant success runtime', () => {
  const token = 'cycle-a-support-tenant-success-token';
  const requests = [];

  const unfiltered = {
    data: {
      cases: [
        { id: 1221, tenant_name: 'Cycle A Supermarket', title: 'Receipt printer alignment issue', category: 'printer', priority: 'high', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-10T07:00:00Z', updated_at: '2026-09-10T07:10:00Z' },
        { id: 1222, tenant_name: 'Cycle A Pharmacy', title: 'Scanner connection issue', category: 'scanner', priority: 'medium', status: 'in_progress', assigned_to: 'admin@example.com', created_at: '2026-09-10T06:00:00Z', updated_at: '2026-09-10T06:15:00Z' }
      ],
      total: 2,
      page: 1,
      pageSize: 10
    }
  };

  const tenantOnly = {
    data: {
      cases: [unfiltered.data.cases[0]],
      total: 1,
      page: 1,
      pageSize: 10
    }
  };

  beforeEach(() => {
    requests.length = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      expect(req.query.pageSize).to.eq('10');
      requests.push({ ...req.query });

      if (req.query.tenant === 'Cycle A Supermarket') {
        expect(String(req.query.page)).to.eq('1');
        expect(req.query.status).to.be.undefined;
        expect(req.query.priority).to.be.undefined;
        expect(req.query.category).to.be.undefined;
        req.reply({ statusCode: 200, body: tenantOnly });
        return;
      }

      expect(req.query.tenant).to.be.undefined;
      req.reply({ statusCode: 200, body: unfiltered });
    }).as('supportCasesBoundary');
  });

  it('refetches with only tenant and converges to authoritative rows while retaining session and route', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Supermarket').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('be.visible');
    cy.contains('Receipt printer alignment issue').should('be.visible');
    cy.contains('Scanner connection issue').should('be.visible');

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

    cy.contains('Cycle A Supermarket').should('be.visible');
    cy.contains('Receipt printer alignment issue').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('not.exist');
    cy.contains('Scanner connection issue').should('not.exist');
    cy.get('input[name="tenant"]').should('have.value', 'Cycle A Supermarket');
    cy.get('input[name="status"]').should('have.value', 'all');
    cy.get('input[name="priority"]').should('have.value', 'all');
    cy.get('input[name="category"]').should('have.value', 'all');
    cy.get('button[aria-current="true"]').should('contain.text', '1');

    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(2);
      expect(String(requests[0].page)).to.eq('1');
      expect(requests[0].tenant).to.be.undefined;
      expect(String(requests[1].page)).to.eq('1');
      expect(requests[1].tenant).to.eq('Cycle A Supermarket');
      expect(requests[1].status).to.be.undefined;
      expect(requests[1].priority).to.be.undefined;
      expect(requests[1].category).to.be.undefined;
    });
  });
});
