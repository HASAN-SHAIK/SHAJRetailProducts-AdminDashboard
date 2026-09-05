describe('Admin runtime - expired API session', () => {
  it('clears stale admin credentials and redirects to login after a protected API returns 401', () => {
    cy.intercept('GET', '**/support/cases/42', {
      statusCode: 401,
      body: { message: 'Session expired' }
    }).as('expiredSession');

    cy.visit('/admin/support-cases/42', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'expired-cycle-a-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 42, name: 'Expired Admin', email: 'expired@example.com' })
        );
      }
    });

    cy.wait('@expiredSession');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/admin/login');
    cy.contains('button', /^login$/i).should('be.visible');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal(null);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.equal(null);
    });
  });
});
