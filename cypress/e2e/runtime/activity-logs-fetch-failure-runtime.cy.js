describe("V1 Admin activity logs fetch failure runtime", () => {
  it("surfaces the API failure without losing the admin session or destabilizing the page", () => {
    let requestCount = 0;

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-logs-token");
      req.reply({
        statusCode: 500,
        body: { message: "Activity log service unavailable" }
      });
    }).as("logsFailure");

    cy.visit("/admin/logs", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-logs-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@logsFailure").its("response.statusCode").should("eq", 500);
    cy.contains("h4", "Activity Logs").should("be.visible");
    cy.contains("Activity log service unavailable").should("be.visible");
    cy.contains("label", "Admin").should("exist");
    cy.contains("label", "Action Type").should("exist");
    cy.contains("label", "Type").should("exist");
    cy.location("pathname").should("eq", "/admin/logs");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-logs-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(1);
    });
  });
});