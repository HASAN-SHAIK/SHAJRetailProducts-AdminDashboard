describe("V1 Admin payments fetch failure runtime", () => {
  it("surfaces the API failure without losing the admin session or destabilizing the page", () => {
    let requestCount = 0;

    cy.intercept("GET", "**/subscription-payments*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-payments-token");
      req.reply({
        statusCode: 500,
        body: { message: "Payment service unavailable" }
      });
    }).as("paymentsFailure");

    cy.visit("/admin/payments", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-payments-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@paymentsFailure").its("response.statusCode").should("eq", 500);
    cy.contains("h4", "Payments").should("be.visible");
    cy.contains("Payment service unavailable").should("be.visible");
    cy.contains("button", "Export CSV").should("be.visible").and("be.enabled");
    cy.location("pathname").should("eq", "/admin/payments");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-payments-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(1);
    });
  });
});
