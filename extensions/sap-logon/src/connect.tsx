import { LaunchProps, showToast, Toast, open, showHUD } from "@raycast/api";
import { createAndOpenSAPCFile, getSAPSystems } from "./utils";

interface ConnectArguments {
  systemId: string;
}

export default async function Command(props: LaunchProps<{ arguments: ConnectArguments }>) {
  const { systemId } = props.arguments;

  try {
    const systems = await getSAPSystems();

    // Find system by ID (case-insensitive) or partial match
    const system = systems.find(
      (s) =>
        s.systemId.toLowerCase() === systemId.toLowerCase() ||
        s.systemId.toLowerCase().includes(systemId.toLowerCase()) ||
        `${s.systemId}-${s.client}`.toLowerCase() === systemId.toLowerCase(),
    );

    if (!system) {
      await showToast({
        style: Toast.Style.Failure,
        title: "System Not Found",
        message: `No SAP system matching "${systemId}" found`,
      });
      return;
    }

    const filePath = await createAndOpenSAPCFile(system);
    await open(filePath);

    await showHUD(`🔗 Connecting to ${system.systemId} (Client ${system.client})`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Connection Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
