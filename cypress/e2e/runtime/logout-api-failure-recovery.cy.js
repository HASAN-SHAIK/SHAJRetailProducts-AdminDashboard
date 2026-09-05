describe('Admin runtime - logout API failure recovery', () => {
  it('clears local admin credentials and returns to login even when logout API fails', () => {
    cy.intercept('POST', '**/auth/logout', {
      statusCode: 500,
      body: { message: 'Simulated logout failure' }
    }).as('logoutFailure');

    cy.visit('/admin/settings', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-valid-local-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 42, name: 'Cycle A Admin', email: 'cycle-a@example.com' })
        );
      }
    });

    cy.contains('h4', 'Settings').should('be.visible');
    cy.contains('Logout').should('be.visible').click();

    cy.wait('@logoutFailure').its('response.statusCode').should('eq', 500);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/admin/login');
    cy.contains('button', /^login$/i).should('be.visible');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal(null);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.equal(null);
    });
  });
});
