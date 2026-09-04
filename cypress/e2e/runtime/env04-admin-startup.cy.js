describe('ENV-04 AdminDashboard startup', () => {
  it('redirects unauthenticated root to the real admin login UI', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('Admin Login').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.contains('button', 'Login').should('be.visible');
  });
});
