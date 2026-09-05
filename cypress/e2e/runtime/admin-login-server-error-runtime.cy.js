describe('Admin runtime - login server error feedback', () => {
  it('keeps the user unauthenticated and shows the API error after login returns 500', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 500,
      body: { message: 'Authentication service unavailable' }
    }).as('loginServerError');

    cy.visit('/admin/login', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('shaj_admin_token');
        win.localStorage.removeItem('shaj_admin_profile');
      }
    });

    cy.contains('h4', 'Admin Login').should('be.visible');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('not-a-real-password');
    cy.contains('button', /^login$/i).click();

    cy.wait('@loginServerError').its('response.statusCode').should('eq', 500);
    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('Authentication service unavailable').should('be.visible');
    cy.contains('button', /^login$/i).should('be.visible').and('not.be.disabled');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal(null);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.equal(null);
    });

    cy.visit('/admin/settings');
    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('h4', 'Admin Login').should('be.visible');
  });
});
