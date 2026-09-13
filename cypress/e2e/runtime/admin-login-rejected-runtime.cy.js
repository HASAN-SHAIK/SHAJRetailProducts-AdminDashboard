describe('V1 Admin rejected login runtime', () => {
  it('surfaces authoritative 401 and remains retryable without authenticating', () => {
    let loginPosts = 0;

    cy.intercept('POST', '**/auth/login', (req) => {
      loginPosts += 1;
      expect(req.body).to.deep.equal({
        email: 'cycle-a-rejected@example.com',
        password: 'wrong-password'
      });
      req.reply({
        statusCode: 401,
        body: { message: 'Invalid email or password' }
      });
    }).as('loginRejected');

    cy.visit('/admin/login', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('shaj_admin_token');
        win.localStorage.removeItem('shaj_admin_profile');
      }
    });

    cy.get('input[name="email"]').type('cycle-a-rejected@example.com');
    cy.get('input[name="password"]').type('wrong-password');
    cy.contains('button', /^Login$/).click();

    cy.wait('@loginRejected').its('response.statusCode').should('eq', 401);
    cy.wrap(null).then(() => expect(loginPosts).to.eq(1));

    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('Invalid email or password').should('be.visible');
    cy.get('input[name="email"]').should('have.value', 'cycle-a-rejected@example.com');
    cy.get('input[name="password"]').should('have.value', 'wrong-password');
    cy.contains('button', /^Login$/).should('be.visible').and('not.be.disabled');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.eq(null);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.eq(null);
    });
  });
});
