# get_todo_tasks.py
import requests
import json
import os

# --- Configuration ---
# IMPORTANT: Replace this with your actual Microsoft Graph Access Token
# You can obtain one via the Graph Explorer (https://developer.microsoft.com/graph/graph-explorer)
# or by registering an application in Azure AD.
# For security, consider using environment variables or a more secure method for production.
ACCESS_TOKEN = os.environ.get("MS_GRAPH_ACCESS_TOKEN", "YOUR_ACCESS_TOKEN_HERE")

# Microsoft Graph API endpoint for tasks in the default To Do list
TASKS_ENDPOINT = "https://graph.microsoft.com/v1.0/me/todo/tasks"
# --- /Configuration ---

def get_todo_tasks(token):
    """Fetches tasks from the default Microsoft To Do list."""
    if token == "YOUR_ACCESS_TOKEN_HERE":
        print("Error: Please replace 'YOUR_ACCESS_TOKEN_HERE' with your actual Microsoft Graph Access Token in the script.")
        return None

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    try:
        response = requests.get(TASKS_ENDPOINT, headers=headers)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching tasks: {e}")
        if response is not None:
            print(f"Response status code: {response.status_code}")
            print(f"Response text: {response.text}")
        return None
    except json.JSONDecodeError:
        print("Error: Could not decode JSON response.")
        print(f"Response text: {response.text}")
        return None

def display_tasks(tasks_data):
    """Displays the fetched tasks."""
    if tasks_data and 'value' in tasks_data:
        tasks = tasks_data['value']
        if not tasks:
            print("No tasks found in your default To Do list.")
            return
        print("--- Your Microsoft To Do Tasks ---")
        for task in tasks:
            status = "Completed" if task.get('status') == 'completed' else "Not Completed"
            title = task.get('title', 'No Title')
            print(f"- {title} [{status}]")
        print("---------------------------------")
    elif tasks_data:
        print("Received data, but could not find tasks list ('value' key missing).")
        print("Data:", tasks_data)


if __name__ == "__main__":
    print("Fetching Microsoft To Do tasks...")
    tasks_response = get_todo_tasks(ACCESS_TOKEN)
    if tasks_response:
        display_tasks(tasks_response)
    else:
        print("Failed to retrieve tasks.")
