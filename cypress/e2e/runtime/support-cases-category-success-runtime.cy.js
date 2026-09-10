describe('Cycle A Support Cases category success runtime', () => {
  const token = 'cycle-a-support-category-success-token';
  const requests = [];

  const unfiltered = {
    data: {
      cases: [
        { id: 1211, tenant_name: 'Cycle A Market', title: 'Printer unavailable', category: 'hardware', priority: 'urgent', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-10T06:00:00Z', updated_at: '2026-09-10T06:10:00Z' },
        { id: 1212, tenant_name: 'Cycle A Pharmacy', title: 'Report discrepancy', category: 'reports', priority: 'medium', status: 'open', assigned_to: 'admin@example.com', created_at: '2026-09-10T05:00:00Z', updated_at: '2026-09-10T05:15:00Z' }
      ],
      total: 2,
      page: 1,
      pageSize: 10
    }
  };

  const hardwareOnly = {
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

      if (req.query.category === 'hardware') {
        expect(String(req.query.page)).to.eq('1');
        expect(req.query.status).to.be.undefined;
        expect(req.query.priority).to.be.undefined;
        expect(req.query.tenant).to.be.undefined;
        req.reply({ statusCode: 200, body: hardwareOnly });
        return;
      }

      expect(req.query.category).to.be.undefined;
      req.reply({ statusCode: 200, body: unfiltered });
    }).as('supportCasesBoundary');
  });

  it('refetches with only category=hardware and converges to authoritative rows while retaining session and route', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Market').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('be.visible');
    cy.contains('Printer unavailable').should('be.visible');
    cy.contains('Report discrepancy').should('be.visible');

    cy.get('input[name="category"]').parent().click();
    cy.get('[role="option"]').contains(/^hardware$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Cycle A Market').should('be.visible');
    cy.contains('Printer unavailable').should('be.visible');
    cy.contains('hardware').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('not.exist');
    cy.contains('Report discrepancy').should('not.exist');
    cy.get('input[name="category"]').should('have.value', 'hardware');
    cy.get('button[aria-current="true"]').should('contain.text', '1');

    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(2);
      expect(String(requests[0].page)).to.eq('1');
      expect(requests[0].category).to.be.undefined;
      expect(String(requests[1].page)).to.eq('1');
      expect(requests[1].category).to.eq('hardware');
      expect(requests[1].status).to.be.undefined;
      expect(requests[1].priority).to.be.undefined;
      expect(requests[1].tenant).to.be.undefined;
    });
  });
});