describe("V1 Admin reports fetch failure runtime", () => {
  it("surfaces a global reports API failure without losing session or route", () => {
    let requestCount = 0;

    cy.intercept("GET", "**/globalreports*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-reports-failure-token");
      req.reply({
        statusCode: 500,
        body: { message: "Reports service unavailable" }
      });
    }).as("reportsRead");

    cy.visit("/admin/reports", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-reports-failure-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@reportsRead").its("response.statusCode").should("eq", 500);
    cy.contains("Reports service unavailable").should("be.visible");
    cy.location("pathname").should("eq", "/admin/reports");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(
        "cycle-a-reports-failure-token"
      );
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(1);
    });
  });
});
