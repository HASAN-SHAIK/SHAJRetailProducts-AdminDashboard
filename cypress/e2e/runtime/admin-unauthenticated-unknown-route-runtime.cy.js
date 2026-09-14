describe('Cycle A unauthenticated unknown-route runtime', () => {
  let reportReads = 0;
  let summaryReads = 0;

  beforeEach(() => {
    reportReads = 0;
    summaryReads = 0;

    cy.intercept('GET', '**/reports**', (req) => {
      reportReads += 1;
      req.reply({ statusCode: 500, body: { message: 'Dashboard reports must not be requested without auth' } });
    });
    cy.intercept('GET', '**/subscriptions/summary**', (req) => {
      summaryReads += 1;
      req.reply({ statusCode: 500, body: { message: 'Dashboard summary must not be requested without auth' } });
    });
  });

  it('routes an unauthenticated unknown admin path through the protected dashboard to Login without starting dashboard reads', () => {
    cy.visit('/admin/this-route-does-not-exist', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('shaj_admin_token');
        win.localStorage.removeItem('shaj_admin_profile');
      }
    });

    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('Login').should('be.visible');
    cy.contains('Platform Overview').should('not.exist');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.be.null;
      expect(win.localStorage.getItem('shaj_admin_profile')).to.be.null;
    });

    cy.then(() => {
      expect(reportReads).to.eq(0);
      expect(summaryReads).to.eq(0);
    });
  });
});
