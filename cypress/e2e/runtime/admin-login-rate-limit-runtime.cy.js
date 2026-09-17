describe('V1 Admin login rate-limit runtime', () => {
  it('surfaces authoritative 429 and remains retryable without authenticating', () => {
    let loginPosts = 0;

    cy.intercept('POST', '**/auth/login', (req) => {
      loginPosts += 1;
      expect(req.body).to.deep.equal({
        email: 'cycle-a-rate-limit@example.com',
        password: 'retry-password'
      });
      req.reply({
        statusCode: 429,
        headers: { 'retry-after': '60' },
        body: { message: 'Too many login attempts' }
      });
    }).as('loginRateLimited');

    cy.visit('/admin/login', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('shaj_admin_token');
        win.localStorage.removeItem('shaj_admin_profile');
      }
    });

    cy.get('input[name="email"]').type('cycle-a-rate-limit@example.com');
    cy.get('input[name="password"]').type('retry-password');
    cy.contains('button', /^Login$/).click();

    cy.wait('@loginRateLimited').its('response.statusCode').should('eq', 429);
    cy.wrap(null).then(() => expect(loginPosts).to.eq(1));

    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('Too many login attempts').should('be.visible');
    cy.get('input[name="email"]').should('have.value', 'cycle-a-rate-limit@example.com');
    cy.get('input[name="password"]').should('have.value', 'retry-password');
    cy.contains('button', /^Login$/).should('be.visible').and('not.be.disabled');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(null);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.eq(null);
    });
  });
});
