# risk_management_agents/agents/qualitative_assessor.py
import random

class QualitativeRiskAssessorAgent:
    """
    Assesses risks that are difficult to quantify, such as operational,
    strategic, reputational, and compliance risks. Uses methods like
    risk matrices, rule-based reasoning, and knowledge bases.
    """
    def __init__(self, coordinator_ref):
        """
        Initializes the Qualitative Risk Assessor Agent.
        Requires a reference to the coordinator for reporting.
        """
        print("Initializing Qualitative Risk Assessor Agent...")
        self.coordinator = coordinator_ref
        # TODO: Load knowledge bases, rule sets, risk matrix definitions, historical case data

    def assess_risk(self, risk_info, assessment_method="matrix"):
        """
        Performs qualitative assessment based on the provided information and method.

        Args:
            risk_info (dict): Information about the risk (description, context, source data).
                               Should contain details like 'description', 'category', 'potential_impact'.
            assessment_method (str): Specifies the method ('matrix', 'rules', 'expert_system').
        """
        print(f"Qualitative Assessor: Assessing risk: {risk_info.get('description', 'N/A')}")
        # Placeholder for assessment logic
        assessment = {}
        if assessment_method == "matrix":
            assessment = self._apply_risk_matrix(risk_info)
        elif assessment_method == "rules":
            assessment = self._apply_rule_based_reasoning(risk_info)
        # Add more methods like knowledge graph traversal, case-based reasoning
        else:
            assessment = self._apply_risk_matrix(risk_info) # Default to matrix

        # Report assessment results to the coordinator
        self.report_assessment(risk_info.get('id', 'unknown_risk'), assessment)
        return assessment

    def _apply_risk_matrix(self, risk_info):
        """Placeholder for applying a likelihood/impact risk matrix."""
        print("Qualitative Assessor: Applying risk matrix...")
        # TODO: Implement logic to determine likelihood and impact based on risk_info and predefined scales
        likelihood_scale = ["Very Low", "Low", "Medium", "High", "Very High"]
        impact_scale = ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"]

        # Dummy assessment
        likelihood = random.choice(likelihood_scale)
        impact = random.choice(impact_scale)
        score = likelihood_scale.index(likelihood) * impact_scale.index(impact) # Example scoring

        return {
            "method": "Risk Matrix",
            "likelihood": likelihood,
            "impact": impact,
            "risk_level": self._determine_risk_level(likelihood, impact), # Helper function needed
            "score": score
        }

    def _apply_rule_based_reasoning(self, risk_info):
        """Placeholder for using a rule engine or expert system logic."""
        print("Qualitative Assessor: Applying rule-based reasoning...")
        # TODO: Implement rule engine interaction (e.g., using Drools, Pyke, or custom logic)
        # Rules might check combinations of factors in risk_info
        # Dummy assessment
        triggered_rules = [f"Rule_{random.randint(1,5)}"]
        assessment_notes = "Based on triggered rules, risk requires monitoring."
        return {
            "method": "Rule-Based",
            "triggered_rules": triggered_rules,
            "assessment": assessment_notes,
            "risk_level": random.choice(["Low", "Medium", "High"]) # Simplified output
        }

    def _determine_risk_level(self, likelihood, impact):
        """Helper to determine overall risk level from matrix."""
        # TODO: Implement actual logic based on the company's risk matrix definition
        l_idx = ["Very Low", "Low", "Medium", "High", "Very High"].index(likelihood)
        i_idx = ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"].index(impact)
        if l_idx + i_idx <= 2: return "Low"
        if l_idx + i_idx <= 4: return "Medium"
        if l_idx + i_idx <= 6: return "High"
        return "Critical"

    def report_assessment(self, risk_id, assessment_results):
        """
        Reports the qualitative assessment results to the Risk Coordinator Agent.
        """
        print(f"Qualitative Assessor: Reporting assessment for risk '{risk_id}' to Coordinator.")
        report = {
            "source": "QualitativeRiskAssessorAgent",
            "type": "QualitativeAssessment",
            "risk_id": risk_id,
            "data": assessment_results
        }
        self.coordinator.receive_report(self.__class__.__name__, report)

# Example usage (for testing purposes)
if __name__ == '__main__':
    class MockCoordinator:
        def receive_report(self, agent_name, report):
            print(f"MockCoordinator received report from {agent_name}: {report}")

    mock_coordinator = MockCoordinator()
    assessor = QualitativeRiskAssessorAgent(mock_coordinator)

    dummy_risk_op = {
        "id": "OP001",
        "description": "Potential for server outage due to aging hardware",
        "category": "Operational",
        "potential_impact": "Service disruption, data loss"
    }
    dummy_risk_rep = {
        "id": "REP001",
        "description": "Negative social media campaign",
        "category": "Reputational",
        "potential_impact": "Brand damage, customer loss"
    }

    assessor.assess_risk(dummy_risk_op, assessment_method="matrix")
    assessor.assess_risk(dummy_risk_rep, assessment_method="rules")
