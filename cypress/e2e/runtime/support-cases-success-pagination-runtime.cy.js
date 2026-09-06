describe('Cycle A Support Cases success/filter/pagination runtime', () => {
  const token = 'cycle-a-support-cases-success-token';
  const requests = [];

  const page1 = {
    data: {
      cases: [
        { id: 101, tenant_name: 'Cycle A Market', title: 'Receipt printer issue', category: 'hardware', priority: 'high', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-06T10:00:00Z', updated_at: '2026-09-06T10:30:00Z' },
        { id: 102, tenant_name: 'Cycle A Pharmacy', title: 'Report mismatch', category: 'reports', priority: 'medium', status: 'resolved', assigned_to: 'admin@example.com', created_at: '2026-09-05T10:00:00Z', updated_at: '2026-09-05T11:00:00Z' }
      ],
      total: 12,
      page: 1,
      pageSize: 10
    }
  };

  const page2 = {
    data: {
      cases: [
        { id: 111, tenant_name: 'Cycle A Bakery', title: 'Second page case', category: 'billing', priority: 'low', status: 'closed', assigned_to: '', created_at: '2026-09-04T10:00:00Z', updated_at: '2026-09-04T10:00:00Z' }
      ],
      total: 12,
      page: 2,
      pageSize: 10
    }
  };

  const openOnly = {
    data: {
      cases: [
        { id: 101, tenant_name: 'Cycle A Market', title: 'Receipt printer issue', category: 'hardware', priority: 'high', status: 'open', assigned_to: 'ops@example.com', created_at: '2026-09-06T10:00:00Z', updated_at: '2026-09-06T10:30:00Z' }
      ],
      total: 1,
      page: 1,
      pageSize: 10
    }
  };

  beforeEach(() => {
    requests.length = 0;
    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      requests.push({ ...req.query });

      const page = String(req.query.page || '1');
      const status = req.query.status;
      expect(req.query.pageSize).to.eq('10');

      if (status === 'open') {
        expect(page).to.eq('1');
        req.reply({ statusCode: 200, body: openOnly });
        return;
      }
      if (page === '2') {
        req.reply({ statusCode: 200, body: page2 });
        return;
      }
      req.reply({ statusCode: 200, body: page1 });
    }).as('supportCasesBoundary');
  });

  it('converges authoritative rows across pagination and status filtering while retaining session and route', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' }));
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Cycle A Market').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('be.visible');
    cy.contains('Second page case').should('not.exist');

    cy.get('button[aria-label="Go to page 2"]').click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);
    cy.contains('Second page case').should('be.visible');
    cy.contains('Cycle A Market').should('not.exist');

    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains(/^open$/).click();
    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Cycle A Market').should('be.visible');
    cy.contains('Receipt printer issue').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('not.exist');
    cy.contains('Second page case').should('not.exist');
    cy.get('button[aria-current="true"]').should('contain.text', '1');

    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(requests).to.have.length(3);
      expect(String(requests[0].page)).to.eq('1');
      expect(requests[0].status).to.be.undefined;
      expect(String(requests[1].page)).to.eq('2');
      expect(requests[1].status).to.be.undefined;
      expect(String(requests[2].page)).to.eq('1');
      expect(requests[2].status).to.eq('open');
    });
  });
});
