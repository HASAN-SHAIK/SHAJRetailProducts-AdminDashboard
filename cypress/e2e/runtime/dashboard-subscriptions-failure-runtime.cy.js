describe('Cycle A Dashboard subscriptions failure runtime', () => {
  const token = 'cycle-a-dashboard-subscriptions-failure-token';
  let subscriptionReads = 0;
  let reportReads = 0;

  beforeEach(() => {
    subscriptionReads = 0;
    reportReads = 0;

    cy.intercept({ method: 'GET', pathname: '/subscriptions/summary' }, (req) => {
      subscriptionReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      req.reply({
        statusCode: 500,
        body: { message: 'Subscription summary unavailable' }
      });
    }).as('subscriptionsBoundary');

    cy.intercept({ method: 'GET', pathname: '/reports' }, (req) => {
      reportReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      req.reply({
        statusCode: 200,
        body: {
          summary: {
            totalTenants: 21,
            activeTenants: 17,
            inactiveTenants: 3,
            expiredTenants: 1,
            monthlyRevenue: 248500,
            paidSubscriptions: 99,
            newTenants: 4,
            recentOrders: [
              { id: 'ORD-A-1001', tenantName: 'Cycle A Market', total: 1250, status: 'Paid' }
            ]
          },
          revenueSeries: [
            { month: 'Jan 2026', revenue: 125000 },
            { month: 'Feb 2026', revenue: 148500 }
          ]
        }
      });
    }).as('reportsBoundary');
  });

  it('surfaces the subscription dependency error without rendering successful reports fallback state or losing session', () => {
    cy.visit('/admin/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@subscriptionsBoundary').its('response.statusCode').should('eq', 500);
    cy.wait('@reportsBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Subscription summary unavailable').should('be.visible');
    cy.contains('Platform Overview').should('not.exist');
    cy.contains('Total Tenants').should('not.exist');
    cy.contains('Revenue Over Time').should('not.exist');
    cy.contains('Recent Orders Across Tenants').should('not.exist');
    cy.contains('21').should('not.exist');
    cy.contains('248500').should('not.exist');

    cy.location('pathname').should('eq', '/admin/dashboard');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(subscriptionReads).to.eq(1);
      expect(reportReads).to.eq(1);
    });
  });
});
