describe('Admin runtime - malformed stored profile', () => {
  it('still boots the login UI when the stored admin profile is malformed JSON', () => {
    cy.visit('/admin/login', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('shaj_admin_token');
        win.localStorage.setItem('shaj_admin_profile', '{malformed-cycle-a-profile');
      }
    });

    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('button', /^login$/i).should('be.visible');
    cy.get('input').should('have.length.at.least', 2);
  });
});
