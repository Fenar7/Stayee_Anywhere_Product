import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    
    # Extract session variable name if it exists
    session_match = re.search(r'(const\s+(\w+)\s*=\s*await\s+requireRole)', content)
    if not session_match:
        # If no session variable exists but requireRole is called, capture it
        if 'await requireRole' in content:
            content = re.sub(r'await\s+requireRole', r'const session = await requireRole', content)
            session_var = 'session'
        else:
            return # No role check, skip
    else:
        session_var = session_match.group(2)
        
    org_id_str = f"{session_var}.user.organizationId"

    # Replace findMany for hostel, user, lead
    for model in ['hostel', 'user', 'lead', 'room', 'bed', 'floor', 'flat']:
        # If it doesn't have where
        content = re.sub(fr'prisma\.{model}\.(findMany|count)\(\s*\{{\s*(?!.*where:\s*{{)', 
                         f'prisma.{model}.\\1({{\n      where: {{\n        organizationId: {org_id_str},\n      }},', 
                         content, flags=re.DOTALL)
        
        # If it already has where
        content = re.sub(fr'prisma\.{model}\.(findMany|count|findFirst)\(\s*\{{\s*where:\s*{{', 
                         f'prisma.{model}.\\1({{\n      where: {{\n        organizationId: {org_id_str},', 
                         content)

        # For create
        content = re.sub(fr'prisma\.{model}\.create\(\s*\{{\s*data:\s*{{', 
                         f'prisma.{model}.create({{\n      data: {{\n        organizationId: {org_id_str},', 
                         content)
                         
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('app/api/admin'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            process_file(os.path.join(root, file))
