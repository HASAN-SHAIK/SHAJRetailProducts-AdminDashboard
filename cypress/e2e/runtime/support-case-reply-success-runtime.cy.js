describe("V1 Admin support case reply success runtime", () => {
  it("appends the admin reply, clears input, and preserves session on success", () => {
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
      expect(req.headers.authorization).to.eq("Bearer cycle-a-support-success-token");
      expect(req.body).to.deep.eq({ message: "Printer queue has been restarted" });
      req.reply({ statusCode: 201, body: { data: { id: 42 } } });
    }).as("replySuccess");

    cy.visit("/admin/support-cases/42", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-support-success-token");
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
      .type("Printer queue has been restarted")
      .should("have.value", "Printer queue has been restarted");

    cy.contains("button", "Send Reply").should("be.enabled").click();
    cy.wait("@replySuccess").its("response.statusCode").should("eq", 201);

    cy.contains("Reply sent").should("be.visible");
    cy.get('textarea[placeholder="Type your response..."]').should("have.value", "");
    cy.contains("Printer queue has been restarted").should("be.visible");
    cy.contains("Please help with the printer").should("be.visible");
    cy.contains("button", "Send Reply").should("be.disabled");
    cy.location("pathname").should("eq", "/admin/support-cases/42");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-support-success-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(replyCount).to.eq(1);
    });
  });
});
