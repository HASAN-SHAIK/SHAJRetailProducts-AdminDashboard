describe('Cycle A Support Cases refresh preserves all active filters runtime', () => {
  const token = 'cycle-a-refresh-all-filters-token';
  const requests = [];
  let fullFilterReads = 0;

  const row = (id, title, overrides = {}) => ({
    id,
    tenant_name: 'Cycle A Supermarket',
    title,
    category: 'hardware',
    priority: 'urgent',
    status: 'open',
    assigned_to: 'ops@example.com',
    created_at: '2026-09-11T06:00:00Z',
    updated_at: '2026-09-11T06:05:00Z',
    ...overrides
  });

  const payload = (rows) => ({ data: { cases: rows, total: rows.length, page: 1, pageSize: 10 } });

  beforeEach(() => {
    requests.length = 0;
    fullFilterReads = 0;

    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      requests.push({ ...req.query });
      expect(String(req.query.page || '1')).to.eq('1');
      expect(req.query.pageSize).to.eq('10');

      const status = req.query.status;
      const category = req.query.category;
      const priority = req.query.priority;
      const tenant = req.query.tenant;

      if (status === 'open' && category === 'hardware' && priority === 'urgent' && tenant === 'Cycle A Supermarket') {
        fullFilterReads += 1;
        req.reply({
          statusCode: 200,
          body: payload([
            row(1901, fullFilterReads === 1 ? 'Open urgent supermarket hardware case' : 'Open urgent supermarket hardware case refreshed')
          ])
        });
        return;
      }

      const rows = [
        row(1901, 'Open urgent supermarket hardware case'),
        row(1902, 'Resolved urgent supermarket hardware case', { status: 'resolved' }),
        row(1903, 'Open medium supermarket hardware case', { priority: 'medium' }),
        row(1904, 'Open urgent supermarket reports case', { category: 'reports' }),
        row(1905, 'Open urgent pharmacy hardware case', { tenant_name: 'Cycle A Pharmacy' })
      ].filter((candidate) => {
        if (status && candidate.status !== status) return false;
        if (category && candidate.category !== category) return false;
        if (priority && candidate.priority !== priority) return false;
        if (tenant && candidate.tenant_name !== tenant) return false;
        return true;
      });

      req.reply({ statusCode: 200, body: payload(rows) });
    }).as('supportCasesBoundary');
  });

  it('refreshes the authoritative all-filter intersection without dropping any active filter', () => {
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

    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains(/^open$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[name="category"]').parent().click();
    cy.get('[role="option"]').contains(/^hardware$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[name="priority"]').parent().click();
    cy.get('[role="option"]').contains(/^urgent$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.get('input[name="tenant"]').clear().type('Cycle A Supermarket');
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Open urgent supermarket hardware case').should('be.visible');

    cy.get('button[aria-label="Refresh support cases"]').click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Open urgent supermarket hardware case refreshed').should('be.visible');
    cy.contains(/^Open urgent supermarket hardware case$/).should('not.exist');
    cy.get('input[name="status"]').should('have.value', 'open');
    cy.get('input[name="category"]').should('have.value', 'hardware');
    cy.get('input[name="priority"]').should('have.value', 'urgent');
    cy.get('input[name="tenant"]').should('have.value', 'Cycle A Supermarket');
    cy.location('pathname').should('eq', '/admin/support-cases');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(6);
      const refresh = requests[5];
      expect(String(refresh.page)).to.eq('1');
      expect(String(refresh.pageSize)).to.eq('10');
      expect(refresh.status).to.eq('open');
      expect(refresh.category).to.eq('hardware');
      expect(refresh.priority).to.eq('urgent');
      expect(refresh.tenant).to.eq('Cycle A Supermarket');
      expect(fullFilterReads).to.eq(2);
    });
  });
});