describe('V1 Admin login forbidden runtime', () => {
  it('surfaces authoritative 403 feedback, preserves retry state, and remains unauthenticated', () => {
    let loginRequests = 0;
    cy.intercept('POST', '**/auth/login', (req) => {
      loginRequests += 1;
      req.reply({ statusCode: 403, body: { message: 'Forbidden' } });
    }).as('login403');

    cy.visit('/admin/login', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('shaj_admin_token');
        win.localStorage.removeItem('shaj_admin_profile');
      }
    });

    cy.get('input[name="email"]').type('cycle-a-403@example.com');
    cy.get('input[name="password"]').type('retry-password');
    cy.get('button[type="submit"]').click();
    cy.wait('@login403').its('response.statusCode').should('eq', 403);

    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('Forbidden').should('be.visible');
    cy.get('input[name="email"]').should('have.value', 'cycle-a-403@example.com');
    cy.get('input[name="password"]').should('have.value', 'retry-password');
    cy.get('button[type="submit"]').should('be.enabled').and('contain', 'Login');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(null);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.eq(null);
    });
    cy.then(() => expect(loginRequests).to.eq(1));
  });
});