describe('V1 Admin login network failure runtime', () => {
  it('surfaces generic network failure and remains retryable without authenticating', () => {
    let loginPosts = 0;

    cy.intercept('POST', '**/auth/login', (req) => {
      loginPosts += 1;
      expect(req.body).to.deep.equal({
        email: 'cycle-a-network@example.com',
        password: 'retry-password'
      });
      req.reply({ forceNetworkError: true });
    }).as('loginNetworkFailure');

    cy.visit('/admin/login', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('shaj_admin_token');
        win.localStorage.removeItem('shaj_admin_profile');
      }
    });

    cy.get('input[name="email"]').type('cycle-a-network@example.com');
    cy.get('input[name="password"]').type('retry-password');
    cy.contains('button', /^Login$/).click();

    cy.wait('@loginNetworkFailure').should(({ error }) => {
      expect(error).to.exist;
    });
    cy.wrap(null).then(() => expect(loginPosts).to.eq(1));

    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('Login failed').should('be.visible');
    cy.get('input[name="email"]').should('have.value', 'cycle-a-network@example.com');
    cy.get('input[name="password"]').should('have.value', 'retry-password');
    cy.contains('button', /^Login$/).should('be.visible').and('not.be.disabled');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(null);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.eq(null);
    });
  });
});