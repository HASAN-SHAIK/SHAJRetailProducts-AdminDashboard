describe('Cycle A Support Cases refresh preserves unfiltered page runtime', () => {
  const token = 'cycle-a-refresh-unfiltered-page-token';
  const requests = [];
  let page2Reads = 0;

  const row = (id, title, status = 'open') => ({
    id,
    tenant_name: 'Cycle A Supermarket',
    title,
    category: 'hardware',
    priority: 'urgent',
    status,
    assigned_to: 'ops@example.com',
    created_at: '2026-09-11T06:00:00Z',
    updated_at: '2026-09-11T06:05:00Z'
  });

  const page = (rows, pageNumber, total = 21) => ({
    data: { cases: rows, total, page: pageNumber, pageSize: 10 }
  });

  beforeEach(() => {
    requests.length = 0;
    page2Reads = 0;

    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      requests.push({ ...req.query });

      const currentPage = String(req.query.page || '1');
      expect(req.query.pageSize).to.eq('10');
      expect(req.query.status).to.be.undefined;
      expect(req.query.priority).to.be.undefined;
      expect(req.query.category).to.be.undefined;
      expect(req.query.tenant).to.be.undefined;

      if (currentPage === '2') {
        page2Reads += 1;
        if (page2Reads === 1) {
          req.reply({ statusCode: 200, body: page([row(1812, 'Unfiltered page two case')], 2) });
          return;
        }
        req.reply({ statusCode: 200, body: page([row(1812, 'Unfiltered page two case refreshed')], 2) });
        return;
      }

      req.reply({
        statusCode: 200,
        body: page([
          row(1811, 'Initial unfiltered page one case'),
          row(1813, 'Initial unfiltered resolved case', 'resolved')
        ], 1)
      });
    }).as('supportCasesBoundary');
  });

  it('refreshes the same authoritative unfiltered page without resetting pagination or adding filters', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Initial unfiltered page one case').should('be.visible');

    cy.get('button[aria-label="Go to page 2"]').click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Unfiltered page two case').should('be.visible');
    cy.get('button[aria-current="true"]').should('contain.text', '2');

    cy.get('button[aria-label="Refresh support cases"]').click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Unfiltered page two case refreshed').should('be.visible');
    cy.contains(/^Unfiltered page two case$/).should('not.exist');
    cy.contains('Initial unfiltered page one case').should('not.exist');
    cy.get('button[aria-current="true"]').should('contain.text', '2');
    cy.get('input[name="status"]').should('have.value', 'all');
    cy.get('input[name="priority"]').should('have.value', 'all');
    cy.get('input[name="category"]').should('have.value', 'all');
    cy.get('input[name="tenant"]').should('have.value', '');
    cy.location('pathname').should('eq', '/admin/support-cases');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(3);

      expect(String(requests[0].page)).to.eq('1');
      expect(String(requests[0].pageSize)).to.eq('10');

      expect(String(requests[1].page)).to.eq('2');
      expect(String(requests[1].pageSize)).to.eq('10');

      expect(String(requests[2].page)).to.eq('2');
      expect(String(requests[2].pageSize)).to.eq('10');
      expect(requests[2].status).to.be.undefined;
      expect(requests[2].priority).to.be.undefined;
      expect(requests[2].category).to.be.undefined;
      expect(requests[2].tenant).to.be.undefined;
      expect(page2Reads).to.eq(2);
    });
  });
});