# risk_management_agents/agents/response_strategist.py
import random

class ResponseStrategyAgent:
    """
    Suggests or designs risk response strategies (Avoid, Transfer, Mitigate, Accept)
    based on assessed risks, company policy, and resource constraints.
    """
    def __init__(self, coordinator_ref):
        """
        Initializes the Response Strategy Agent.
        Requires a reference to the coordinator for reporting.
        """
        print("Initializing Response Strategy Agent...")
        self.coordinator = coordinator_ref
        # TODO: Load risk appetite framework, control library, cost-benefit analysis models
        # TODO: Load historical effectiveness data of past responses

    def develop_strategies(self, prioritized_risks):
        """
        Develops response strategies for a list of prioritized risks.

        Args:
            prioritized_risks (list): A list of risk objects/dictionaries,
                                      sorted by priority, including assessment details.
                                      Example format: [{'id': 'REP001', 'level': 'High', ...}, ...]
        """
        print(f"Response Strategist: Developing strategies for {len(prioritized_risks)} risks.")
        strategies = {}
        for risk in prioritized_risks:
            risk_id = risk.get('id', 'unknown_risk')
            risk_level = risk.get('level', 'Medium') # Default if level not provided
            print(f"  - Developing strategy for risk: {risk_id} (Level: {risk_level})")
            strategies[risk_id] = self._generate_strategy(risk)

        # Report suggested strategies to the coordinator
        self.report_strategies(strategies)
        return strategies

    def _generate_strategy(self, risk_info):
        """
        Generates a specific strategy for a single risk.
        """
        # Placeholder logic: Simple strategy based on risk level
        # TODO: Implement more sophisticated logic:
        #   - Consider risk category (operational, financial, etc.)
        #   - Perform cost-benefit analysis of potential controls
        #   - Check against risk appetite statements
        #   - Query control library for applicable mitigations
        #   - Consider resource availability

        risk_level = risk_info.get('level', 'Medium')
        strategy_options = ["Accept", "Mitigate", "Transfer", "Avoid"]
        suggested_strategy = "Accept" # Default for Low risk
        control_suggestions = []

        if risk_level in ["High", "Critical"]:
            # Prioritize Avoid or Transfer for critical risks, Mitigate for High
            if risk_level == "Critical":
                 # Try to avoid first, then transfer, then mitigate strongly
                 suggested_strategy = random.choice(["Avoid", "Transfer", "Mitigate"])
            else: # High risk
                 suggested_strategy = random.choice(["Mitigate", "Transfer"])

            if suggested_strategy == "Mitigate":
                control_suggestions = self._suggest_controls(risk_info)
            elif suggested_strategy == "Transfer":
                control_suggestions = ["Explore insurance options", "Outsource activity"]
            elif suggested_strategy == "Avoid":
                 control_suggestions = ["Cease activity", "Change project scope"]

        elif risk_level == "Medium":
            suggested_strategy = random.choice(["Mitigate", "Accept"])
            if suggested_strategy == "Mitigate":
                control_suggestions = self._suggest_controls(risk_info)

        return {
            "suggested_strategy": suggested_strategy,
            "control_suggestions": control_suggestions,
            "rationale": f"Based on risk level '{risk_level}' and basic policy." # Placeholder rationale
        }

    def _suggest_controls(self, risk_info):
        """Placeholder for suggesting specific control measures."""
        # TODO: Implement lookup in a control library based on risk category/description
        category = risk_info.get('category', 'General')
        suggestions = [f"Implement Control_{category}_{random.randint(100, 199)}"]
        if random.random() > 0.5: # Add a second suggestion sometimes
             suggestions.append(f"Enhance Monitoring_{category}_{random.randint(200, 299)}")
        return suggestions


    def report_strategies(self, strategies):
        """
        Reports the suggested response strategies to the Risk Coordinator Agent.
        """
        print("Response Strategist: Reporting suggested strategies to Coordinator.")
        report = {
            "source": "ResponseStrategyAgent",
            "type": "ResponseStrategies",
            "data": strategies
        }
        self.coordinator.receive_report(self.__class__.__name__, report)

# Example usage (for testing purposes)
if __name__ == '__main__':
    class MockCoordinator:
        def receive_report(self, agent_name, report):
            print(f"MockCoordinator received report from {agent_name}: {report}")

    mock_coordinator = MockCoordinator()
    strategist = ResponseStrategyAgent(mock_coordinator)

    dummy_risks = [
        {"id": "OP001", "level": "High", "category": "Operational"},
        {"id": "FIN002", "level": "Critical", "category": "Financial"},
        {"id": "REP001", "level": "Medium", "category": "Reputational"},
        {"id": "COMP005", "level": "Low", "category": "Compliance"},
    ]

    strategist.develop_strategies(dummy_risks)
