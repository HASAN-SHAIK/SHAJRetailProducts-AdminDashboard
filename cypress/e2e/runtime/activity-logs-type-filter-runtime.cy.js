describe("V1 Admin activity logs type filter runtime", () => {
  it("refetches and converges to authoritative state for the selected Type filter", () => {
    let requestCount = 0;

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-logs-type-token");

      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");
      const action = url.searchParams.get("action");
      const type = url.searchParams.get("type");

      if (type === "updates_made") {
        expect(admin).to.eq(null);
        expect(action).to.eq(null);
        req.reply({
          statusCode: 200,
          body: {
            data: {
              logs: [
                {
                  id: 402,
                  admin_name: "Update Admin",
                  admin_email: "updates@example.com",
                  action: "UPDATE_PLAN",
                  entity_type: "subscription",
                  entity_id: 52,
                  metadata: { type: "updates_made", plan: "PRO" },
                  created_at: "2026-09-08T01:30:00.000Z"
                }
              ]
            }
          }
        });
        return;
      }

      expect(admin).to.eq(null);
      expect(action).to.eq(null);
      expect(type).to.eq(null);
      req.reply({
        statusCode: 200,
        body: {
          data: {
            logs: [
              {
                id: 401,
                admin_name: "Create Admin",
                admin_email: "create@example.com",
                action: "CREATE_TENANT",
                entity_type: "tenant",
                entity_id: 9,
                metadata: { name: "Cycle A Tenant" },
                created_at: "2026-09-08T01:15:00.000Z"
              },
              {
                id: 402,
                admin_name: "Update Admin",
                admin_email: "updates@example.com",
                action: "UPDATE_PLAN",
                entity_type: "subscription",
                entity_id: 52,
                metadata: { type: "updates_made", plan: "PRO" },
                created_at: "2026-09-08T01:30:00.000Z"
              }
            ]
          }
        }
      });
    }).as("logsRead");

    cy.visit("/admin/logs", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-logs-type-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 8, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("h4", "Activity Logs").should("be.visible");
    cy.contains("401").should("be.visible");
    cy.contains("CREATE_TENANT").should("be.visible");
    cy.contains("402").should("be.visible");
    cy.contains("UPDATE_PLAN").should("be.visible");

    cy.get('div[role="combobox"]').eq(2).click();
    cy.contains('[role="option"]', "Updates Made").click();

    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const filteredUrl = new URL(interception.request.url);
      expect(filteredUrl.searchParams.get("type")).to.eq("updates_made");
      expect(filteredUrl.searchParams.get("admin")).to.eq(null);
      expect(filteredUrl.searchParams.get("action")).to.eq(null);
    });

    cy.contains("402").should("be.visible");
    cy.contains("Update Admin").should("be.visible");
    cy.contains("UPDATE_PLAN").should("be.visible");
    cy.contains("401").should("not.exist");
    cy.contains("CREATE_TENANT").should("not.exist");
    cy.get('div[role="combobox"]').eq(2).should("contain.text", "Updates Made");
    cy.location("pathname").should("eq", "/admin/logs");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-logs-type-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(2);
    });
  });
});