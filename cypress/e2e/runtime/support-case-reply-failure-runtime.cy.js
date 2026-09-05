describe("V1 Admin support case reply failure runtime", () => {
  it("preserves retry state and session when reply API fails", () => {
    let replyCount = 0;

    cy.intercept("GET", "**/support/cases/42", {
      statusCode: 200,
      body: {
        data: {
          case: {
            id: 42,
            tenant_name: "Cycle A Tenant",
            title: "Receipt printer unavailable",
            category: "device",
            status: "open",
            priority: "high",
            assigned_to: "ops@shaj.test",
            assigned_to_name: "Cycle A Ops",
            created_at: "2026-09-05T10:00:00.000Z",
            updated_at: "2026-09-05T10:05:00.000Z",
            description: "Printer cannot be reached from counter",
            messages: [
              {
                id: 1,
                author_name: "Tenant User",
                role: "tenant",
                body: "Please help with the printer",
                created_at: "2026-09-05T10:01:00.000Z"
              }
            ]
          }
        }
      }
    }).as("supportCase");

    cy.intercept("POST", "**/support/cases/42/reply", (req) => {
      replyCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-support-token");
      expect(req.body).to.deep.eq({ message: "Retry-safe admin response" });
      req.reply({
        statusCode: 500,
        body: { message: "Support reply service unavailable" }
      });
    }).as("replyFailure");

    cy.visit("/admin/support-cases/42", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-support-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@supportCase");
    cy.contains("h4", "Receipt printer unavailable").should("be.visible");
    cy.contains("Please help with the printer").should("be.visible");

    cy.get('textarea[placeholder="Type your response..."]')
      .type("Retry-safe admin response")
      .should("have.value", "Retry-safe admin response");

    cy.contains("button", "Send Reply").should("be.enabled").click();
    cy.wait("@replyFailure").its("response.statusCode").should("eq", 500);

    cy.contains("Support reply service unavailable").should("be.visible");
    cy.get('textarea[placeholder="Type your response..."]')
      .should("have.value", "Retry-safe admin response");
    cy.contains("button", "Send Reply").should("be.enabled");
    cy.contains("Retry-safe admin response").should("have.length", 1);
    cy.contains("Reply sent").should("not.exist");
    cy.location("pathname").should("eq", "/admin/support-cases/42");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-support-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(replyCount).to.eq(1);
    });
  });
});
