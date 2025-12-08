export default function AnalysisResult({ result, onProceed }) {
	if (!result) return null;

	const p = result.participant || {};
	const per = result.per_trigger || {};

	return (
		<div style={{ minHeight: "100vh", padding: "3rem", background: "#f8fafc" }}>
			<div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
				<h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
					Analysis Results
				</h1>
				{p.status !== "ok" ? (
					<div style={{ color: "#b91c1c" }}>
						<p>Insufficient data to compute a reliable analysis.</p>
						<p>Please complete more color trials to get a diagnosis.</p>
					</div>
				) : (
					<div>
						<p style={{ fontSize: "1.125rem" }}>
							Diagnosis: <strong>{p.diagnosis}</strong>
						</p>
						<p style={{ color: "#374151" }}>
							Consistency score: {p.participant_score?.toFixed?.(3) ?? "—"}
						</p>
						<p style={{ color: "#374151" }}>Mean RT: {p.rt_mean ?? "—"} ms</p>

						<div style={{ marginTop: "1.5rem", textAlign: "left" }}>
							<h3 style={{ marginBottom: "0.5rem" }}>Associations</h3>
							{Object.keys(per).length === 0 ? (
								<p>No per-trigger data available.</p>
							) : (
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
										gap: "12px",
									}}
								>
									{Object.entries(per).map(([k, v]) => (
										<div
											key={k}
											style={{
												background: "white",
												padding: "0.75rem",
												borderRadius: 8,
												boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
											}}
										>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
												}}
											>
												<div>
													<div style={{ fontWeight: 700 }}>{k}</div>
													<div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
														{v.status}
													</div>
												</div>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: 8,
													}}
												>
													{v.representative_hex ? (
														<div
															style={{
																width: 36,
																height: 36,
																borderRadius: 6,
																background: v.representative_hex,
																border: "1px solid rgba(0,0,0,0.08)",
															}}
														/>
													) : null}
													<div
														style={{ fontSize: "0.85rem", color: "#374151" }}
													>
														{v.representative_hex ?? ""}
													</div>
												</div>
											</div>
											<div
												style={{
													marginTop: 8,
													fontSize: "0.85rem",
													color: "#4b5563",
												}}
											>
												Mean distance: {v.mean_d?.toFixed?.(3) ?? "—"}
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div style={{ marginTop: "2rem" }}>
							<button
								type="button"
								onClick={onProceed}
								style={{
									background: "#2563eb",
									color: "white",
									padding: "0.75rem 1.75rem",
									borderRadius: 6,
									border: "none",
									cursor: "pointer",
								}}
							>
								Proceed to Speed Congruency Test
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
