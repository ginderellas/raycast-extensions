import { Icon, MenuBarExtra, open, showHUD, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { SAPSystem } from "./types";
import { createAndOpenSAPCFile, getSAPSystems } from "./utils";

export default function Command() {
  const [systems, setSystems] = useState<SAPSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSystems() {
      const loadedSystems = await getSAPSystems();
      setSystems(loadedSystems);
      setIsLoading(false);
    }
    loadSystems();
  }, []);

  async function handleConnect(system: SAPSystem) {
    try {
      const filePath = await createAndOpenSAPCFile(system);
      await open(filePath);
      await showHUD(`🔗 Connecting to ${system.systemId} (Client ${system.client})`);
    } catch (error) {
      await showHUD(`❌ Failed to connect to ${system.systemId}: ${error}`);
    }
  }

  async function openMainView() {
    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  }

  async function openAddSystem() {
    await launchCommand({ name: "add-system", type: LaunchType.UserInitiated });
  }

  return (
    <MenuBarExtra icon={Icon.Globe} tooltip="SAP Quick Connect" isLoading={isLoading}>
      {systems.length === 0 ? (
        <MenuBarExtra.Item title="No SAP Systems Configured" icon={Icon.Warning} onAction={openAddSystem} />
      ) : (
        <MenuBarExtra.Section title="SAP Systems">
          {systems.map((system) => (
            <MenuBarExtra.Item
              key={system.id}
              icon={Icon.Link}
              title={`${system.systemId} - Client ${system.client}`}
              subtitle={system.username}
              onAction={() => handleConnect(system)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Manage SAP Systems..."
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openMainView}
        />
        <MenuBarExtra.Item
          title="Add New System..."
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={openAddSystem}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
