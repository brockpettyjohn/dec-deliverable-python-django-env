from django import forms
from django.shortcuts import redirect, render, reverse
from django.contrib.auth.decorators import user_passes_test
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from catalyst.models import User
from django.contrib import messages

@login_required
def list(request):
    users = User.objects.all()
    context = {
        'users': users,
    }
    return render(request, 'catalyst/users/list.html', context=context)

class UserForm(forms.ModelForm):
    password=forms.CharField(widget=forms.PasswordInput())
    confirm_password=forms.CharField(widget=forms.PasswordInput())
    class Meta:
        model = User
        labels = {"role": "Account Type"}
        fields = ('first_name', 'last_name', 'username', 'email', 'password', 'confirm_password', 'role')

    def save(self, commit=True, password=None):
        user = super(UserForm, self).save(commit=False)
        if self.cleaned_data['password']:
            user.set_password(self.cleaned_data['password'])
        elif password:
            user.password = password
        if commit:
            user.save()
        return user

    def clean(self):
        cleaned_data = super(UserForm, self).clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        if password != confirm_password:
            raise forms.ValidationError({'confirm_password': "Password and confirm password does not match."})

    def __init__(self, *args, **kwargs):
        super(UserForm, self).__init__(*args, **kwargs)
        if self.instance:
            self.fields['password'].required = False
            self.fields['confirm_password'].required = False
            for visible in self.visible_fields():
                visible.field.widget.attrs['class'] = 'form-control'

@login_required
def user_details(request, user_id):
    user_record = User.objects.get(id=user_id)

    if request.method == 'POST':
        password = None if request.POST.get('password') else user_record.password
        form = UserForm(request.POST, instance=user_record)
        if form.is_valid():
            form.save(password=password)
            messages.success(request, 'User successfully saved.')
    else:
        form = UserForm(instance=user_record)
    if not request.user.has_perm('catalyst.change_user'):
        form.fields['role'].widget.attrs['disabled'] = True

    context = {
    'form': form,
    'can_view_user': request.user.has_perm('catalyst.view_user'),
    }
    return render(request, 'catalyst/users/user_details.html', context=context)
    

@login_required
def create(request):

    if request.method == 'POST':
        form = UserForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'User successfully created.')
            return redirect('catalyst_users')
    else:
        form = UserForm()

    context = {
        'form' : form,
    }

    return render(request, 'catalyst/users/create.html', context=context)

@login_required
@user_passes_test(lambda u: u.has_perm('catalyst.view_user'))
def user_delete(request, user_id):
    if user_id:
        user = User.objects.get(id=user_id)
        user.delete()
    return redirect('catalyst_users')


class LoginForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('username', 'password')
        widgets = {
            'username': forms.TextInput(attrs={'placeholder': 'Username'}),
            'password': forms.PasswordInput(attrs={'placeholder': 'Password'}),
        }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(LoginForm, self).__init__(*args, **kwargs)

    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')
        user = authenticate(self.request, username=username, password=password)
        self.cleaned_data['user'] = user
        if not user or not user.is_active:
            raise forms.ValidationError(
                "Sorry, the username or password is invalid. Please try again.")
        return self.cleaned_data


def sign_in(request):
    if request.method == 'POST':
        form = LoginForm(request.POST, request=request)
        if form.is_valid():
            user = form.cleaned_data.get('user')
            if user is not None:
                login(request, user)
                return redirect('catalyst_books')
    else:
        form = LoginForm()
    context = {
        'form': form,
        # 'fade_in': request.GET.get('animate') or not request.COOKIES.get('faded_in'),
    }
    response = render(request, 'catalyst/sign_in.html', context)
    # response.set_cookie(key='faded_in', value=1)
    return response


def sign_out(request):
    logout(request)
    return redirect('catalyst_sign_in')