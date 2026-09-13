describe('Admin runtime - authenticated logout success', () => {
  it('posts logout once, clears local credentials, and returns to Login', () => {
    let logoutCalls = 0;

    cy.intercept('GET', '**/subscriptions/summary', {
      statusCode: 200,
      body: { paidCount: 3 }
    }).as('subscriptions');

    cy.intercept('GET', '**/reports', {
      statusCode: 200,
      body: {
        tenants: { total: 1, active: 1, inactive: 0, expired: 0, newTenants: 0 },
        revenue: { monthly: 1000, series: [], byPlan: [] },
        subscriptions: { paid: 3 },
        systemLogs: [],
        recentOrders: []
      }
    }).as('reports');

    cy.intercept('POST', '**/auth/logout', (req) => {
      logoutCalls += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-admin-logout-token');
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('logout');

    cy.visit('/admin/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-admin-logout-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 141, name: 'Cycle A Admin', email: 'cycle-a-admin@shaj.test' })
        );
      }
    });

    cy.contains('Cycle A Admin').should('be.visible');
    cy.contains('div', /^Logout$/).should('be.visible').click();

    cy.wait('@logout').its('response.statusCode').should('eq', 200);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/admin/login');
    cy.contains('button', /^login$/i).should('be.visible');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal(null);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.equal(null);
      expect(logoutCalls).to.equal(1);
    });
  });
});
