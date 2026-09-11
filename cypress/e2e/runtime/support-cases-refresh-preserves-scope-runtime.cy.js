describe('Cycle A Support Cases refresh preserves filtered page scope runtime', () => {
  const token = 'cycle-a-refresh-filtered-page-token';
  const requests = [];
  let filteredPage2Reads = 0;

  const row = (id, title, status = 'open') => ({
    id,
    tenant_name: 'Cycle A Supermarket',
    title,
    category: 'hardware',
    priority: 'urgent',
    status,
    assigned_to: 'ops@example.com',
    created_at: '2026-09-11T05:00:00Z',
    updated_at: '2026-09-11T05:05:00Z'
  });

  const page = (rows, pageNumber, total = 21) => ({
    data: { cases: rows, total, page: pageNumber, pageSize: 10 }
  });

  beforeEach(() => {
    requests.length = 0;
    filteredPage2Reads = 0;

    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      requests.push({ ...req.query });

      const currentPage = String(req.query.page || '1');
      const status = req.query.status;
      expect(req.query.pageSize).to.eq('10');

      if (status === 'open' && currentPage === '2') {
        filteredPage2Reads += 1;
        if (filteredPage2Reads === 1) {
          req.reply({ statusCode: 200, body: page([row(1803, 'Open filtered page two case')], 2) });
          return;
        }
        req.reply({ statusCode: 200, body: page([row(1803, 'Open filtered page two case refreshed')], 2) });
        return;
      }

      if (status === 'open') {
        req.reply({ statusCode: 200, body: page([row(1802, 'Open filtered page one case')], 1) });
        return;
      }

      req.reply({
        statusCode: 200,
        body: page([
          row(1801, 'Initial unfiltered open case'),
          row(1804, 'Initial unfiltered resolved case', 'resolved')
        ], 1)
      });
    }).as('supportCasesBoundary');
  });

  it('refreshes the same authoritative filtered page without resetting filters or pagination', () => {
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
    cy.contains('Initial unfiltered open case').should('be.visible');

    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains(/^open$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Open filtered page one case').should('be.visible');

    cy.get('button[aria-label="Go to page 2"]').click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Open filtered page two case').should('be.visible');
    cy.get('button[aria-current="true"]').should('contain.text', '2');

    cy.get('button[aria-label="Refresh support cases"]').click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Open filtered page two case refreshed').should('be.visible');
    cy.contains(/^Open filtered page two case$/).should('not.exist');
    cy.contains('Open filtered page one case').should('not.exist');
    cy.get('input[name="status"]').should('have.value', 'open');
    cy.get('button[aria-current="true"]').should('contain.text', '2');
    cy.location('pathname').should('eq', '/admin/support-cases');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(4);

      expect(String(requests[0].page)).to.eq('1');
      expect(requests[0].status).to.be.undefined;

      expect(String(requests[1].page)).to.eq('1');
      expect(requests[1].status).to.eq('open');

      expect(String(requests[2].page)).to.eq('2');
      expect(requests[2].status).to.eq('open');

      expect(String(requests[3].page)).to.eq('2');
      expect(String(requests[3].pageSize)).to.eq('10');
      expect(requests[3].status).to.eq('open');
      expect(requests[3].priority).to.be.undefined;
      expect(requests[3].category).to.be.undefined;
      expect(requests[3].tenant).to.be.undefined;
      expect(filteredPage2Reads).to.eq(2);
    });
  });
});