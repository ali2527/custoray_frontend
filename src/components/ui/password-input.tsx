'use client'

import * as React from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function PasswordInput({
	className,
	disabled,
	value,
	defaultValue,
	onChange,
	...props
}: Omit<React.ComponentProps<"input">, "type">) {
	const [showPassword, setShowPassword] = React.useState(false)
	const isControlled = value !== undefined
	const [uncontrolledEmpty, setUncontrolledEmpty] = React.useState(
		() => defaultValue == null || String(defaultValue) === ''
	)
	const isEmpty = isControlled ? value === '' : uncontrolledEmpty
	const toggleDisabled = disabled || isEmpty

	return (
		<div className="relative">
			<Input
				type={showPassword ? 'text' : 'password'}
				className={cn('hide-password-toggle pr-10', className)}
				disabled={disabled}
				value={value}
				defaultValue={defaultValue}
				onChange={(event) => {
					if (!isControlled) {
						setUncontrolledEmpty(event.target.value === '')
					}
					onChange?.(event)
				}}
				{...props}
			/>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="text-muted-foreground hover:text-foreground absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
				disabled={toggleDisabled}
				onClick={() => setShowPassword((prev) => !prev)}
			>
				{showPassword ? (
					<EyeOffIcon className="h-4 w-4" aria-hidden="true" />
				) : (
					<EyeIcon className="h-4 w-4" aria-hidden="true" />
				)}
				<span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
			</Button>

			{/* hides browsers password toggles */}
			<style>{`
					.hide-password-toggle::-ms-reveal,
					.hide-password-toggle::-ms-clear {
						visibility: hidden;
						pointer-events: none;
						display: none;
					}
				`}</style>
		</div>
	)
}
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
