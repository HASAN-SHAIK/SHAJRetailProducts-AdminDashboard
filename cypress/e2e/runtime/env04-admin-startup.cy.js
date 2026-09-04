describe('ENV-04 AdminDashboard startup', () => {
  it('redirects unauthenticated root to the real admin login UI', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/admin/login');
    cy.contains('Admin Login').should('be.visible');
    cy.findByLabelText ? null : null;
    cy.get('input').filter('[type="email"]').should('be.visible');
    cy.get('input').filter('[type="password"]').should('be.visible');
    cy.contains('button', 'Login').should('be.visible');
  });
});
