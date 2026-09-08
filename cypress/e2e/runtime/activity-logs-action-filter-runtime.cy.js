describe("V1 Admin activity logs action filter runtime", () => {
  it("refetches and converges to authoritative state for the selected Action Type filter", () => {
    let requestCount = 0;

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-logs-action-token");

      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");
      const action = url.searchParams.get("action");
      const type = url.searchParams.get("type");

      if (action === "UPDATE_PLAN") {
        expect(admin).to.eq(null);
        expect(type).to.eq(null);
        req.reply({
          statusCode: 200,
          body: {
            data: {
              logs: [
                {
                  id: 302,
                  admin_name: "Ops Admin",
                  admin_email: "ops@example.com",
                  action: "UPDATE_PLAN",
                  entity_type: "subscription",
                  entity_id: 42,
                  metadata: { plan: "PRO" },
                  created_at: "2026-09-08T00:30:00.000Z"
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
                id: 301,
                admin_name: "Cycle A Admin",
                admin_email: "cycle-a@example.com",
                action: "CREATE_TENANT",
                entity_type: "tenant",
                entity_id: 7,
                metadata: { name: "Cycle A Tenant" },
                created_at: "2026-09-08T00:15:00.000Z"
              },
              {
                id: 302,
                admin_name: "Ops Admin",
                admin_email: "ops@example.com",
                action: "UPDATE_PLAN",
                entity_type: "subscription",
                entity_id: 42,
                metadata: { plan: "PRO" },
                created_at: "2026-09-08T00:30:00.000Z"
              }
            ]
          }
        }
      });
    }).as("logsRead");

    cy.visit("/admin/logs", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-logs-action-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("h4", "Activity Logs").should("be.visible");
    cy.contains("301").should("be.visible");
    cy.contains("CREATE_TENANT").should("be.visible");
    cy.contains("302").should("be.visible");
    cy.contains("UPDATE_PLAN").should("be.visible");

    cy.get('div[role="combobox"]').eq(1).click();
    cy.contains('[role="option"]', "UPDATE_PLAN").click();

    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const filteredUrl = new URL(interception.request.url);
      expect(filteredUrl.searchParams.get("action")).to.eq("UPDATE_PLAN");
      expect(filteredUrl.searchParams.get("admin")).to.eq(null);
      expect(filteredUrl.searchParams.get("type")).to.eq(null);
    });

    cy.contains("302").should("be.visible");
    cy.contains("Ops Admin").should("be.visible");
    cy.contains("UPDATE_PLAN").should("be.visible");
    cy.contains("301").should("not.exist");
    cy.contains("CREATE_TENANT").should("not.exist");
    cy.get('div[role="combobox"]').eq(1).should("contain.text", "UPDATE_PLAN");
    cy.location("pathname").should("eq", "/admin/logs");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-logs-action-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(2);
    });
  });
});
