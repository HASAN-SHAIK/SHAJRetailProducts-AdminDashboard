describe('Cycle A Dashboard success runtime', () => {
  const token = 'cycle-a-dashboard-success-token';
  let subscriptionReads = 0;
  let reportReads = 0;

  beforeEach(() => {
    subscriptionReads = 0;
    reportReads = 0;

    cy.intercept({ method: 'GET', pathname: '/subscriptions/summary' }, (req) => {
      subscriptionReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      req.reply({
        statusCode: 200,
        body: { paidCount: 13 }
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
              { id: 'ORD-A-1001', tenant: 'Cycle A Market', amount: 1250, status: 'Paid' },
              { id: 'ORD-A-1002', tenant: 'Cycle A Pharmacy', amount: 860, status: 'Pending' }
            ],
            systemLogs: [
              { id: 'LOG-501', message: 'Cycle A dashboard runtime healthy' }
            ],
            revenueByPlan: [
              { name: 'Pro', value: 148500 },
              { name: 'Basic', value: 100000 }
            ]
          },
          revenueSeries: [
            { month: 'Jan 2026', revenue: 220000 },
            { month: 'Feb 2026', revenue: 248500 }
          ]
        }
      });
    }).as('reportsBoundary');
  });

  it('renders authoritative dashboard state from both successful dependencies and preserves session', () => {
    cy.visit('/admin/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@subscriptionsBoundary').its('response.statusCode').should('eq', 200);
    cy.wait('@reportsBoundary').its('response.statusCode').should('eq', 200);

    cy.contains('Platform Overview').should('be.visible');
    cy.contains('Total Tenants').closest('.MuiCard-root').should('contain.text', '21');
    cy.contains('Active Tenants').closest('.MuiCard-root').should('contain.text', '17');
    cy.contains('Inactive Tenants').closest('.MuiCard-root').should('contain.text', '3');
    cy.contains('Expired Tenants').closest('.MuiCard-root').should('contain.text', '1');
    cy.contains('Total Monthly Revenue').closest('.MuiCard-root').should('contain.text', '₹248500');
    cy.contains('Total Subscriptions Paid').closest('.MuiCard-root').should('contain.text', '13');
    cy.contains('New Tenants (This Month)').closest('.MuiCard-root').should('contain.text', '4');
    cy.contains('99').should('not.exist');

    cy.contains('Revenue Over Time').should('be.visible');
    cy.get('.recharts-line-curve').should('have.length.at.least', 1).and('have.attr', 'd').and('not.be.empty');
    cy.get('.recharts-wrapper').first().find('svg').should('contain.text', 'Jan 2026').and('contain.text', 'Feb 2026');

    cy.contains('Revenue By Plan').should('be.visible');
    cy.contains('Pro').should('be.visible');
    cy.contains('₹148500').should('be.visible');
    cy.contains('Basic').should('be.visible');
    cy.contains('₹100000').should('be.visible');
    cy.get('.recharts-pie-sector').should('have.length.at.least', 2);

    cy.contains('System Logs').should('be.visible');
    cy.contains('LOG-501').should('be.visible');
    cy.contains('Cycle A dashboard runtime healthy').should('be.visible');

    cy.contains('Recent Orders Across Tenants').should('be.visible');
    cy.contains('ORD-A-1001').should('be.visible');
    cy.contains('Cycle A Market').should('be.visible');
    cy.contains('1250').should('be.visible');
    cy.contains('Paid').should('be.visible');
    cy.contains('ORD-A-1002').should('be.visible');
    cy.contains('Cycle A Pharmacy').should('be.visible');
    cy.contains('860').should('be.visible');
    cy.contains('Pending').should('be.visible');

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
