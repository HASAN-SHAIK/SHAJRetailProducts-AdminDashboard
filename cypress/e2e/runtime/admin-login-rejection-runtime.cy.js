describe('Admin runtime - rejected login containment', () => {
  it('keeps the user unauthenticated and protected routes blocked after a rejected login', () => {
    let loginCalls = 0;

    cy.intercept('POST', '**/auth/login', (req) => {
      loginCalls += 1;
      req.reply({
        statusCode: 401,
        body: { message: 'Invalid credentials' },
      });
    }).as('rejectedLogin');

    cy.visit('/admin/login', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('shaj_admin_token');
        win.localStorage.removeItem('shaj_admin_profile');
      },
    });

    cy.contains('label', /^Email$/i)
      .invoke('attr', 'for')
      .then((id) => cy.get(`#${CSS.escape(id)}`).type('invalid.admin@example.com'));
    cy.contains('label', /^Password$/i)
      .invoke('attr', 'for')
      .then((id) => cy.get(`#${CSS.escape(id)}`).type('WrongPassword123!'));

    cy.contains('button', /^Login$/i).click();
    cy.wait('@rejectedLogin').its('response.statusCode').should('eq', 401);

    cy.wrap(null).then(() => {
      expect(loginCalls).to.eq(1);
    });

    cy.location('pathname').should('eq', '/admin/login');
    cy.contains(/Invalid credentials/i).should('be.visible');
    cy.contains('button', /^Login$/i).should('be.visible').and('not.be.disabled');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal(null);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.equal(null);
    });

    cy.visit('/admin/settings');
    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('button', /^Login$/i).should('be.visible');
  });
});
