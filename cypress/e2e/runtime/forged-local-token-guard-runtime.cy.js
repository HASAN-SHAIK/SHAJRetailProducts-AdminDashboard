describe('Admin runtime - forged local token guard', () => {
  it('does not expose protected settings UI when only an unvalidated local token exists', () => {
    cy.visit('/admin/settings', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'forged-cycle-a-token');
        win.localStorage.removeItem('shaj_admin_profile');
      }
    });

    cy.location('pathname', { timeout: 10000 }).should('eq', '/admin/login');
    cy.contains('button', /^login$/i).should('be.visible');
    cy.contains('Register Platform Admin').should('not.exist');
  });
});
