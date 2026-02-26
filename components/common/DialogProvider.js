import React from "react";
import AppDialog from "../AppDialog";

const DialogContext = React.createContext(null);

export function DialogProvider({ children }) {
	const [state, setState] = React.useState({
		visible: false,
		title: "",
		message: "",
		actions: [],
	});

	const openDialog = React.useCallback(({ title, message, actions }) => {
		setState({
			visible: true,
			title: title || "",
			message: message || "",
			actions: actions || [],
		});
	}, []);

	const closeDialog = React.useCallback(() => {
		setState((s) => ({ ...s, visible: false }));
	}, []);

	return (
		<DialogContext.Provider value={{ openDialog, closeDialog }}>
			{children}

			<AppDialog visible={state.visible} title={state.title} message={state.message} actions={state.actions} onDismiss={closeDialog} />
		</DialogContext.Provider>
	);
}

export function useDialog() {
	const ctx = React.useContext(DialogContext);
	if (!ctx) {
		throw new Error("useDialog must be used within a DialogProvider");
	}
	return ctx;
}
