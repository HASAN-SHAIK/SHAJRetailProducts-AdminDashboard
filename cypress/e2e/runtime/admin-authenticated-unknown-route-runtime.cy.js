describe('V1 Admin authenticated unknown-route fallback', () => {
  it('redirects an authenticated unknown admin route to the real dashboard without losing session state', () => {
    let reportsReads = 0;
    let subscriptionReads = 0;

    cy.intercept('GET', '**/reports', (req) => {
      reportsReads += 1;
      expect(req.headers.authorization).to.eq('Bearer cycle-a-unknown-route-token');
      req.reply({
        statusCode: 200,
        body: {
          summary: {
            totalTenants: 2,
            activeTenants: 2,
            inactiveTenants: 0,
            expiredTenants: 0,
            monthlyRevenue: 1000,
            paidSubscriptions: 2,
            newTenants: 1,
            recentOrders: [],
            systemLogs: [],
            revenueByPlan: []
          },
          revenueSeries: []
        }
      });
    }).as('reports');

    cy.intercept('GET', '**/subscriptions/summary', (req) => {
      subscriptionReads += 1;
      expect(req.headers.authorization).to.eq('Bearer cycle-a-unknown-route-token');
      req.reply({ statusCode: 200, body: { paidCount: 2 } });
    }).as('subscriptions');

    cy.visit('/admin/this-route-does-not-exist', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-unknown-route-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 9001, name: 'Cycle A Route Admin', email: 'route.admin@example.com' })
        );
      }
    });

    cy.location('pathname').should('eq', '/admin/dashboard');
    cy.contains('Platform Overview').should('be.visible');
    cy.contains('Cycle A Route Admin').should('be.visible');
    cy.contains('Admin Login').should('not.exist');

    cy.wait('@reports').its('response.statusCode').should('eq', 200);
    cy.wait('@subscriptions').its('response.statusCode').should('eq', 200);

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq('cycle-a-unknown-route-token');
      expect(JSON.parse(win.localStorage.getItem('shaj_admin_profile'))).to.include({
        id: 9001,
        name: 'Cycle A Route Admin',
        email: 'route.admin@example.com'
      });
      expect(reportsReads).to.eq(1);
      expect(subscriptionReads).to.eq(1);
    });

    cy.location('pathname').should('eq', '/admin/dashboard');
  });
});
