describe('ENV-04 AdminDashboard application startup', () => {
  it('loads the real production app and renders the admin login UI', () => {
    cy.visit('/admin/login');

    cy.location('pathname').should('eq', '/admin/login');
    cy.get('#root').should(($root) => {
      expect($root.children().length, 'React root children').to.be.greaterThan(0);
      expect($root.text().trim().length, 'React root text length').to.be.greaterThan(0);
    });

    cy.contains('h4', /^Admin Login$/).should('be.visible');
    cy.get('input[name="email"]').should('be.visible').and('have.attr', 'type', 'email');
    cy.get('input[name="password"]').should('be.visible').and('have.attr', 'type', 'password');
    cy.contains('button', /^Login$/).should('be.visible').and('not.be.disabled');
    cy.contains(/Sign in to manage SHAJ NextGen Technologies tenants\./).should('be.visible');
  });
});
