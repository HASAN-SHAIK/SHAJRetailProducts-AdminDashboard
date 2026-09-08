describe("V1 Admin activity logs type reset runtime", () => {
  it("removes the Type query and restores authoritative unfiltered state when reset to All", () => {
    let requestCount = 0;

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-logs-type-reset-token");

      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");
      const action = url.searchParams.get("action");
      const type = url.searchParams.get("type");

      expect(admin).to.eq(null);
      expect(action).to.eq(null);

      if (requestCount === 2) {
        expect(type).to.eq("updates_made");
        req.reply({
          statusCode: 200,
          body: {
            data: {
              logs: [
                {
                  id: 502,
                  admin_name: "Update Admin",
                  admin_email: "updates@example.com",
                  action: "UPDATE_PLAN",
                  entity_type: "subscription",
                  entity_id: 62,
                  metadata: { type: "updates_made", plan: "PRO" },
                  created_at: "2026-09-08T02:15:00.000Z"
                }
              ]
            }
          }
        });
        return;
      }

      expect(type).to.eq(null);
      req.reply({
        statusCode: 200,
        body: {
          data: {
            logs: [
              {
                id: 501,
                admin_name: "Create Admin",
                admin_email: "create@example.com",
                action: "CREATE_TENANT",
                entity_type: "tenant",
                entity_id: 10,
                metadata: { name: "Cycle A Reset Tenant" },
                created_at: "2026-09-08T02:00:00.000Z"
              },
              {
                id: 502,
                admin_name: "Update Admin",
                admin_email: "updates@example.com",
                action: "UPDATE_PLAN",
                entity_type: "subscription",
                entity_id: 62,
                metadata: { type: "updates_made", plan: "PRO" },
                created_at: "2026-09-08T02:15:00.000Z"
              }
            ]
          }
        }
      });
    }).as("logsRead");

    cy.visit("/admin/logs", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-logs-type-reset-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 9, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("501").should("be.visible");
    cy.contains("502").should("be.visible");

    cy.get('div[role="combobox"]').eq(2).click();
    cy.contains('[role="option"]', "Updates Made").click();
    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);

    cy.contains("502").should("be.visible");
    cy.contains("501").should("not.exist");
    cy.get('div[role="combobox"]').eq(2).should("contain.text", "Updates Made");

    cy.get('div[role="combobox"]').eq(2).click();
    cy.contains('[role="option"]', "All").click();

    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const resetUrl = new URL(interception.request.url);
      expect(resetUrl.searchParams.get("type")).to.eq(null);
      expect(resetUrl.searchParams.get("admin")).to.eq(null);
      expect(resetUrl.searchParams.get("action")).to.eq(null);
    });

    cy.contains("501").should("be.visible");
    cy.contains("Create Admin").should("be.visible");
    cy.contains("CREATE_TENANT").should("be.visible");
    cy.contains("502").should("be.visible");
    cy.get('div[role="combobox"]').eq(2).should("contain.text", "All");
    cy.location("pathname").should("eq", "/admin/logs");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-logs-type-reset-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(3);
    });
  });
});