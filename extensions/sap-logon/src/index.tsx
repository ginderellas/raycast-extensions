import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { SAPSystem } from "./types";
import { createAndOpenSAPCFile, deleteSAPSystem, getSAPSystems } from "./utils";
import EditSystemForm from "./edit-system";

export default function Command() {
  const [systems, setSystems] = useState<SAPSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function loadSystems() {
    setIsLoading(true);
    const loadedSystems = await getSAPSystems();
    setSystems(loadedSystems);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSystems();
  }, []);

  async function handleConnect(system: SAPSystem) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting...",
        message: `Opening ${system.systemId}`,
      });

      const filePath = await createAndOpenSAPCFile(system);
      await open(filePath);

      await showToast({
        style: Toast.Style.Success,
        title: "Connected",
        message: `Opened SAP connection to ${system.systemId}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(system: SAPSystem) {
    const confirmed = await confirmAlert({
      title: "Delete SAP System",
      message: `Are you sure you want to delete "${system.systemId}" (Client ${system.client})?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteSAPSystem(system.id);
      await loadSystems();
      await showToast({
        style: Toast.Style.Success,
        title: "System Deleted",
        message: `${system.systemId} has been removed`,
      });
    }
  }

  function handleEdit(system: SAPSystem) {
    push(<EditSystemForm system={system} onSave={loadSystems} />);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search SAP systems...">
      {systems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No SAP Systems Configured"
          description="Add your first SAP system using the 'Add SAP System' command"
        />
      ) : (
        systems.map((system) => (
          <List.Item
            key={system.id}
            icon={{ source: Icon.Globe, tintColor: Color.Blue }}
            title={system.systemId}
            subtitle={`Client ${system.client}`}
            accessories={[
              { text: system.applicationServer },
              { text: system.username, icon: Icon.Person },
              { tag: { value: system.language.toUpperCase(), color: Color.Green } },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Connection">
                  <Action title="Connect to SAP" icon={Icon.Link} onAction={() => handleConnect(system)} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage">
                  <Action
                    title="Edit System"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => handleEdit(system)}
                  />
                  <Action
                    title="Delete System"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(system)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Info">
                  <Action.CopyToClipboard
                    title="Copy System ID"
                    content={system.systemId}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Application Server"
                    content={system.applicationServer}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
