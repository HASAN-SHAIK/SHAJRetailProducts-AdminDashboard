describe('Cycle A Support Cases fetch failure runtime', () => {
  const token = 'cycle-a-support-cases-failure-token';
  let supportReads = 0;

  beforeEach(() => {
    supportReads = 0;

    cy.intercept({ method: 'GET', pathname: '/support/cases' }, (req) => {
      supportReads += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);
      expect(req.query.page).to.eq('1');
      expect(req.query.pageSize).to.eq('10');
      req.reply({
        statusCode: 500,
        body: { message: 'Support case service unavailable' }
      });
    }).as('supportCasesBoundary');
  });

  it('surfaces initial support-case read failure without stale rows, session loss, or route instability', () => {
    cy.visit('/admin/support-cases', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'cycle-a@example.com', role: 'platform_admin' })
        );
      }
    });

    cy.wait('@supportCasesBoundary').its('response.statusCode').should('eq', 500);

    cy.contains('Support Cases').should('be.visible');
    cy.contains('Support case service unavailable').should('be.visible');
    cy.contains('Tenant').should('be.visible');
    cy.contains('Status').should('be.visible');
    cy.contains('Priority').should('be.visible');
    cy.contains('Category').should('be.visible');
    cy.contains('View').should('not.exist');
    cy.get('table tbody tr').should('not.exist');

    cy.location('pathname').should('eq', '/admin/support-cases');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.be.null;
    });

    cy.then(() => {
      expect(supportReads).to.eq(1);
    });
  });
});